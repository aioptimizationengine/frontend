"""
Server Log Analysis API Routes
Endpoints for uploading and analyzing server logs
"""

import os
import aiofiles
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
import structlog
import tempfile
import asyncio

from database import get_db
from models import StandardResponse, ErrorResponse
from db_models import (
    User, Brand, UserBrand, ServerLogUpload,
    UserSubscription, SubscriptionPlan
)
from log_analyzer import ServerLogAnalyzer
from subscription_manager import SubscriptionManager
from utils import ValidationUtils
from auth_utils import get_current_user

logger = structlog.get_logger()

router = APIRouter(prefix="/logs", tags=["Server Logs"])

# Supported log formats
SUPPORTED_LOG_FORMATS = {
    "nginx": ["nginx", "nginx-combined", "nginx-common"],
    "apache": ["apache", "apache-combined", "apache-common"],
    "cloudflare": ["cloudflare"],
    "aws-alb": ["aws-alb"],
    "custom": ["custom"]
}

MAX_FILE_SIZE = 1 * 1024 * 1024 * 1024  # 1GB

@router.post("/upload", response_model=StandardResponse)
async def upload_server_log(
    file: UploadFile = File(...),
    brand_id: str = Form(...),
    log_format: str = Form(...),
    timezone: str = Form("UTC"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload server log file for analysis"""
    
    # Verify user has access to brand
    user_brand = db.query(UserBrand).filter(
        and_(
            UserBrand.user_id == current_user.id,
            UserBrand.brand_id == brand_id
        )
    ).first()
    
    if not user_brand:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this brand"
        )
    
    # Check subscription limits
    subscription_manager = SubscriptionManager(db)
    usage_check = await subscription_manager.check_usage_limits(
        current_user,
        "server_log_analysis"
    )
    
    if not usage_check["allowed"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=usage_check["reason"]
        )
    
    # Validate log format
    if not any(log_format in formats for formats in SUPPORTED_LOG_FORMATS.values()):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported log format. Supported formats: {list(SUPPORTED_LOG_FORMATS.keys())}"
        )
    
    # Check file size
    file_size = 0
    temp_file_path = None
    
    try:
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix=".log") as temp_file:
            temp_file_path = temp_file.name
            
            # Read and save file in chunks
            chunk_size = 1024 * 1024  # 1MB chunks
            async with aiofiles.open(temp_file_path, 'wb') as f:
                while True:
                    chunk = await file.read(chunk_size)
                    if not chunk:
                        break
                    file_size += len(chunk)
                    
                    # Check size limit
                    if file_size > MAX_FILE_SIZE:
                        raise HTTPException(
                            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                            detail=f"File too large. Maximum size is {MAX_FILE_SIZE / (1024**3):.1f}GB"
                        )
                    
                    await f.write(chunk)
        
        # Check daily limit for subscription
        today_gb = await _get_today_log_usage(current_user, db)
        subscription = subscription_manager.get_active_subscription(current_user)
        
        if subscription and subscription.server_log_gb_limit:
            if today_gb + (file_size / (1024**3)) > subscription.server_log_gb_limit:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Daily log analysis limit exceeded ({subscription.server_log_gb_limit}GB/day)"
                )
        
        # Create upload record
        log_upload = ServerLogUpload(
            user_id=current_user.id,
            brand_id=brand_id,
            filename=ValidationUtils.sanitize_filename(file.filename),
            file_size_bytes=file_size,
            file_format=log_format,
            status="uploaded"
        )
        db.add(log_upload)
        db.commit()
        
        # Start async analysis
        asyncio.create_task(
            _analyze_log_file(
                log_upload.id,
                temp_file_path,
                log_format,
                brand_id,
                db
            )
        )
        
        return StandardResponse(
            success=True,
            data={
                "upload_id": str(log_upload.id),
                "status": "processing",
                "message": "Log file uploaded successfully. Analysis started."
            }
        )
        
    except Exception as e:
        logger.error(f"Log upload failed: {e}")
        if temp_file_path and os.path.exists(temp_file_path):
            os.unlink(temp_file_path)
        raise
    
    finally:
        # Cleanup will be handled by analysis task
        pass

@router.get("/upload/{upload_id}/status", response_model=StandardResponse)
async def get_upload_status(
    upload_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get status of log analysis"""
    
    log_upload = db.query(ServerLogUpload).filter(
        and_(
            ServerLogUpload.id == upload_id,
            ServerLogUpload.user_id == current_user.id
        )
    ).first()
    
    if not log_upload:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Upload not found"
        )
    
    response_data = {
        "upload_id": str(log_upload.id),
        "status": log_upload.status,
        "filename": log_upload.filename,
        "file_size_mb": round(log_upload.file_size_bytes / (1024**2), 2),
        "uploaded_at": log_upload.created_at.isoformat()
    }
    
    if log_upload.status == "completed":
        response_data.update({
            "total_requests": log_upload.total_requests,
            "bot_requests": log_upload.bot_requests,
            "unique_bots": log_upload.unique_bots,
            "date_range": {
                "start": log_upload.date_range_start.isoformat() if log_upload.date_range_start else None,
                "end": log_upload.date_range_end.isoformat() if log_upload.date_range_end else None
            },
            "processing_time": (
                log_upload.processing_completed_at - log_upload.processing_started_at
            ).total_seconds() if log_upload.processing_completed_at else None
        })
    elif log_upload.status == "failed":
        response_data["error"] = log_upload.error_message
    
    return StandardResponse(
        success=True,
        data=response_data
    )

@router.get("/analysis/{brand_id}", response_model=StandardResponse)
async def get_log_analysis(
    brand_id: str,
    days: int = 30,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get server log analysis results for a brand"""
    
    # Verify access
    user_brand = db.query(UserBrand).filter(
        and_(
            UserBrand.user_id == current_user.id,
            UserBrand.brand_id == brand_id
        )
    ).first()
    
    if not user_brand:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this brand"
        )
    
    # Get brand
    brand = db.query(Brand).filter(Brand.id == brand_id).first()
    if not brand:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Brand not found"
        )
    
    # Initialize analyzer
    redis_url = os.getenv('REDIS_URL', 'redis://localhost:6379')
    analyzer = ServerLogAnalyzer(redis.from_url(redis_url))
    
    # Get real-time metrics from Redis
    metrics = await analyzer.get_real_time_metrics(brand.name, days)
    
    # Get recent uploads
    recent_uploads = db.query(ServerLogUpload).filter(
        and_(
            ServerLogUpload.brand_id == brand_id,
            ServerLogUpload.status == "completed",
            ServerLogUpload.created_at >= datetime.utcnow() - timedelta(days=days)
        )
    ).order_by(ServerLogUpload.created_at.desc()).limit(10).all()
    
    return StandardResponse(
        success=True,
        data={
            "brand_name": brand.name,
            "analysis_period_days": days,
            "metrics": {
                "citation_frequency": metrics['real_citation_frequency'],
                "crawl_frequency": metrics['real_crawl_frequency'],
                "platform_coverage": metrics['platform_coverage'],
                "platform_citation_rates": metrics['platform_citation_rates'],
                "content_patterns": metrics['content_patterns'],
                "crawl_trends": metrics['crawl_trends'],
                "brand_mention_trends": metrics['brand_mention_trends']
            },
            "recent_uploads": [
                {
                    "id": str(upload.id),
                    "filename": upload.filename,
                    "analyzed_at": upload.processing_completed_at.isoformat(),
                    "total_requests": upload.total_requests,
                    "bot_requests": upload.bot_requests
                }
                for upload in recent_uploads
            ]
        }
    )

@router.get("/bot-activity/{brand_id}", response_model=StandardResponse)
async def get_bot_activity(
    brand_id: str,
    days: int = 7,
    platform: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get detailed bot activity for a brand"""
    
    # Verify access
    user_brand = db.query(UserBrand).filter(
        and_(
            UserBrand.user_id == current_user.id,
            UserBrand.brand_id == brand_id
        )
    ).first()
    
    if not user_brand:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this brand"
        )
    
    # Get bot visits from database
    query = db.query(BotVisit).filter(
        and_(
            BotVisit.brand_id == brand_id,
            BotVisit.timestamp >= datetime.utcnow() - timedelta(days=days)
        )
    )
    
    if platform:
        query = query.filter(BotVisit.platform == platform)
    
    bot_visits = query.order_by(BotVisit.timestamp.desc()).limit(1000).all()
    
    # Aggregate data
    platform_stats = {}
    hourly_distribution = {}
    top_paths = {}
    
    for visit in bot_visits:
        # Platform stats
        if visit.platform not in platform_stats:
            platform_stats[visit.platform] = {
                "total_visits": 0,
                "brand_mentions": 0,
                "unique_paths": set(),
                "success_rate": {"success": 0, "total": 0}
            }
        
        platform_stats[visit.platform]["total_visits"] += 1
        if visit.brand_mentioned:
            platform_stats[visit.platform]["brand_mentions"] += 1
        platform_stats[visit.platform]["unique_paths"].add(visit.path)
        
        platform_stats[visit.platform]["success_rate"]["total"] += 1
        if visit.status_code < 400:
            platform_stats[visit.platform]["success_rate"]["success"] += 1
        
        # Hourly distribution
        hour = visit.timestamp.hour
        if hour not in hourly_distribution:
            hourly_distribution[hour] = 0
        hourly_distribution[hour] += 1
        
        # Top paths
        if visit.path not in top_paths:
            top_paths[visit.path] = {"count": 0, "brand_mentions": 0}
        top_paths[visit.path]["count"] += 1
        if visit.brand_mentioned:
            top_paths[visit.path]["brand_mentions"] += 1
    
    # Format platform stats
    formatted_platform_stats = {}
    for platform, stats in platform_stats.items():
        formatted_platform_stats[platform] = {
            "total_visits": stats["total_visits"],
            "brand_mentions": stats["brand_mentions"],
            "citation_rate": (stats["brand_mentions"] / stats["total_visits"] * 100) if stats["total_visits"] > 0 else 0,
            "unique_paths": len(stats["unique_paths"]),
            "success_rate": (stats["success_rate"]["success"] / stats["success_rate"]["total"] * 100) if stats["success_rate"]["total"] > 0 else 0
        }
    
    # Get top 20 paths
    sorted_paths = sorted(top_paths.items(), key=lambda x: x[1]["count"], reverse=True)[:20]
    
    return StandardResponse(
        success=True,
        data={
            "period_days": days,
            "total_bot_visits": len(bot_visits),
            "platform_breakdown": formatted_platform_stats,
            "hourly_distribution": hourly_distribution,
            "top_paths": [
                {
                    "path": path,
                    "visits": data["count"],
                    "brand_mentions": data["brand_mentions"],
                    "citation_rate": (data["brand_mentions"] / data["count"] * 100) if data["count"] > 0 else 0
                }
                for path, data in sorted_paths
            ]
        }
    )

@router.post("/analyze-sample", response_model=StandardResponse)
async def analyze_log_sample(
    log_sample: str,
    log_format: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Analyze a sample of log data without uploading a file"""
    
    # Check if user has any active subscription
    subscription = db.query(UserSubscription).filter(
        and_(
            UserSubscription.user_id == current_user.id,
            UserSubscription.status == "active"
        )
    ).first()
    
    if not subscription:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Active subscription required"
        )
    
    # Limit sample size
    if len(log_sample) > 10000:  # 10KB max for samples
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Sample too large. Maximum 10KB."
        )
    
    try:
        # Initialize analyzer
        redis_url = os.getenv('REDIS_URL', 'redis://localhost:6379')
        analyzer = ServerLogAnalyzer(redis.from_url(redis_url))
        
        # Parse sample lines
        lines = log_sample.strip().split('\n')
        bot_visits = []
        total_requests = 0
        
        for line in lines[:100]:  # Limit to 100 lines
            total_requests += 1
            parsed = await analyzer.parse_log_line(line, log_format)
            
            if parsed:
                user_agent = parsed.get('user_agent', '')
                bot_result = analyzer.identify_llm_bot(user_agent)
                
                if bot_result:
                    bot_pattern, confidence = bot_result
                    bot_visits.append({
                        "bot_name": bot_pattern.name,
                        "platform": bot_pattern.platform,
                        "confidence": confidence,
                        "path": parsed.get('path', ''),
                        "status_code": parsed.get('status', ''),
                        "user_agent": user_agent
                    })
        
        return StandardResponse(
            success=True,
            data={
                "total_lines": len(lines),
                "total_parsed": total_requests,
                "bot_visits_found": len(bot_visits),
                "bot_percentage": (len(bot_visits) / total_requests * 100) if total_requests > 0 else 0,
                "identified_bots": bot_visits[:10]  # First 10 bot visits
            }
        )
        
    except Exception as e:
        logger.error(f"Log sample analysis failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to analyze log sample"
        )

# Helper functions

async def _analyze_log_file(
    upload_id: str,
    file_path: str,
    log_format: str,
    brand_id: str,
    db: Session
):
    """Async task to analyze uploaded log file"""
    
    try:
        # Update status to processing
        upload = db.query(ServerLogUpload).filter(
            ServerLogUpload.id == upload_id
        ).first()
        
        if not upload:
            return
        
        upload.status = "processing"
        upload.processing_started_at = datetime.utcnow()
        db.commit()
        
        # Get brand name
        brand = db.query(Brand).filter(Brand.id == brand_id).first()
        if not brand:
            raise Exception("Brand not found")
        
        # Initialize analyzer
        redis_url = os.getenv('REDIS_URL', 'redis://localhost:6379')
        geoip_path = os.getenv('GEOIP_PATH')
        analyzer = ServerLogAnalyzer(redis.from_url(redis_url), geoip_path)
        
        # Analyze file
        results = await analyzer.analyze_log_file(
            log_file_path=file_path,
            brand_name=brand.name,
            log_format=log_format
        )
        
        # Update upload record with results
        upload.status = "completed"
        upload.processing_completed_at = datetime.utcnow()
        upload.total_requests = results['total_requests']
        upload.bot_requests = results['llm_bot_requests']
        upload.unique_bots = results['unique_bot_ips']
        
        # Extract date range from results
        if results.get('daily_trends'):
            dates = list(results['daily_trends'].get(
                next(iter(results['daily_trends'])), {}
            ).keys())
            if dates:
                upload.date_range_start = datetime.fromisoformat(min(dates))
                upload.date_range_end = datetime.fromisoformat(max(dates))
        
        db.commit()
        
        logger.info(f"Log analysis completed for upload {upload_id}")
        
    except Exception as e:
        logger.error(f"Log analysis failed for upload {upload_id}: {e}")
        
        # Update upload status
        upload = db.query(ServerLogUpload).filter(
            ServerLogUpload.id == upload_id
        ).first()
        
        if upload:
            upload.status = "failed"
            upload.error_message = str(e)
            db.commit()
    
    finally:
        # Cleanup temp file
        if os.path.exists(file_path):
            os.unlink(file_path)

async def _get_today_log_usage(user: User, db: Session) -> float:
    """Get today's log usage in GB"""
    
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    
    uploads = db.query(ServerLogUpload).filter(
        and_(
            ServerLogUpload.user_id == user.id,
            ServerLogUpload.created_at >= today_start
        )
    ).all()
    
    total_bytes = sum(upload.file_size_bytes for upload in uploads)
    return total_bytes / (1024**3)  # Convert to GB
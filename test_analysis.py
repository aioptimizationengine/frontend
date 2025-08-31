#!/usr/bin/env python3
"""
Test script for /analyze-brand endpoint with competitor analysis
Tests both API response and database persistence
"""

import asyncio
import json
import sys
import os
from datetime import datetime

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

async def test_brand_analysis():
    """Test brand analysis with competitors"""
    try:
        # Import after path setup
        from api import app
        from database import get_db
        from db_models import Analysis, Brand
        from fastapi.testclient import TestClient
        
        print(f"[{datetime.now()}] Starting brand analysis test...")
        
        # Create test client
        client = TestClient(app)
        
        # Test payload with competitors
        test_payload = {
            "brand_name": "TestBrand",
            "product_categories": ["software", "saas", "productivity"],
            "competitor_names": ["Slack", "Microsoft Teams", "Discord"],
            "website_url": "https://testbrand.com",
            "content_sample": "TestBrand is a revolutionary productivity software that helps teams collaborate better."
        }
        
        print(f"[{datetime.now()}] Sending request to /analyze-brand...")
        print(f"Payload: {json.dumps(test_payload, indent=2)}")
        
        # Make request
        response = client.post("/analyze-brand", json=test_payload)
        
        print(f"[{datetime.now()}] Response status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"[{datetime.now()}] Analysis successful!")
            
            # Check response structure
            if data.get("success"):
                analysis_data = data.get("data", {})
                analysis_id = analysis_data.get("analysis_id")
                competitors = analysis_data.get("competitors_overview", [])
                
                print(f"Analysis ID: {analysis_id}")
                print(f"Brand: {analysis_data.get('brand_name')}")
                print(f"Competitors found: {len(competitors)}")
                
                # Print competitor details
                for i, comp in enumerate(competitors):
                    print(f"  Competitor {i+1}: {comp.get('name', 'Unknown')}")
                    if 'error' in comp:
                        print(f"    Error: {comp['error']}")
                    else:
                        print(f"    Brand mentions: {comp.get('brand_mentions', 0)}")
                        print(f"    Success rate: {comp.get('success_rate', 0):.2%}")
                        print(f"    Avg position: {comp.get('avg_position', 0)}")
                        print(f"    Tested queries: {comp.get('tested_queries', 0)}")
                
                # Verify database persistence
                print(f"\n[{datetime.now()}] Checking database persistence...")
                
                try:
                    db = next(get_db())
                    
                    # Find the saved analysis
                    if analysis_id and analysis_id != "analysis_" and not analysis_id.startswith("analysis_"):
                        analysis = db.query(Analysis).filter(Analysis.id == analysis_id).first()
                        if analysis:
                            print(f"✓ Analysis found in database: {analysis.id}")
                            print(f"  Brand ID: {analysis.brand_id}")
                            print(f"  Status: {analysis.status}")
                            print(f"  Analysis type: {analysis.analysis_type}")
                            
                            if analysis.metrics:
                                metrics_keys = list(analysis.metrics.keys())
                                print(f"  Metrics keys: {metrics_keys}")
                                
                                if 'competitors' in analysis.metrics:
                                    saved_competitors = analysis.metrics['competitors']
                                    print(f"  Saved competitors: {len(saved_competitors)}")
                                    
                                    # Verify competitor data matches response
                                    if len(saved_competitors) == len(competitors):
                                        print("  ✓ Competitor count matches response")
                                        
                                        for i, (saved, response) in enumerate(zip(saved_competitors, competitors)):
                                            if saved.get('name') == response.get('name'):
                                                print(f"    ✓ Competitor {i+1} name matches: {saved.get('name')}")
                                            else:
                                                print(f"    ✗ Competitor {i+1} name mismatch: {saved.get('name')} vs {response.get('name')}")
                                    else:
                                        print(f"  ✗ Competitor count mismatch: DB={len(saved_competitors)}, Response={len(competitors)}")
                                else:
                                    print("  ✗ No competitors data in saved metrics")
                            else:
                                print("  ✗ No metrics data saved")
                        else:
                            print(f"  ✗ Analysis not found in database: {analysis_id}")
                    else:
                        print(f"  ⚠ Using fallback analysis ID, skipping DB check: {analysis_id}")
                        
                except Exception as db_error:
                    print(f"  ✗ Database check failed: {db_error}")
                
            else:
                print(f"Analysis failed: {data.get('error', 'Unknown error')}")
        else:
            print(f"Request failed with status {response.status_code}")
            print(f"Response: {response.text}")
            
    except Exception as e:
        print(f"Test failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_brand_analysis())

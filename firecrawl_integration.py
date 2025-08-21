"""
Firecrawl Integration Module
Integrates the open-source Firecrawl tool for enhanced web scraping
"""

import os
import aiohttp
import asyncio
from typing import Dict, Any, List, Optional
from datetime import datetime
import structlog
from fastapi import HTTPException, status

logger = structlog.get_logger()

class FirecrawlIntegration:
    """
    Integrates Firecrawl for advanced web scraping and content extraction
    Based on https://github.com/mendableai/firecrawl
    """
    
    def __init__(self, config: Dict[str, Any]):
        self.api_url = config.get('firecrawl_api_url', 'http://localhost:3002')
        self.api_key = config.get('firecrawl_api_key')
        self.timeout = config.get('request_timeout', 30)
        
        # For self-hosted deployment
        self.self_hosted = config.get('firecrawl_self_hosted', True)
        
    async def scrape_website(
        self,
        url: str,
        options: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Scrape a single webpage using Firecrawl
        
        Args:
            url: The URL to scrape
            options: Additional options for scraping
                - formats: List of formats to return (markdown, html, links, etc.)
                - onlyMainContent: Extract only main content
                - includeTags: HTML tags to include
                - excludeTags: HTML tags to exclude
        
        Returns:
            Scraped content with metadata
        """
        
        endpoint = f"{self.api_url}/v0/scrape"
        
        payload = {
            "url": url,
            "formats": options.get("formats", ["markdown", "html", "links"]),
            "onlyMainContent": options.get("onlyMainContent", True),
            "waitFor": options.get("waitFor", 1000),  # Wait for JS rendering
            "headers": options.get("headers", {})
        }
        
        if options:
            if "includeTags" in options:
                payload["includeTags"] = options["includeTags"]
            if "excludeTags" in options:
                payload["excludeTags"] = options["excludeTags"]
        
        headers = {
            "Content-Type": "application/json"
        }
        
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    endpoint,
                    json=payload,
                    headers=headers,
                    timeout=aiohttp.ClientTimeout(total=self.timeout)
                ) as response:
                    
                    if response.status == 200:
                        data = await response.json()
                        
                        # Extract structured data
                        return results
    
    def _extract_text(self, content: str, pattern: Optional[str]) -> str:
        """Extract text based on pattern"""
        if not pattern:
            return content[:500]  # Return first 500 chars if no pattern
        
        # Simple pattern matching - can be enhanced with regex
        lines = content.split('\n')
        for line in lines:
            if pattern.lower() in line.lower():
                return line.strip()
        
        return ""
    
    def _extract_list(self, content: str, pattern: Optional[str]) -> List[str]:
        """Extract list items based on pattern"""
        items = []
        lines = content.split('\n')
        
        in_list = False
        for line in lines:
            if pattern and pattern.lower() in line.lower():
                in_list = True
                continue
            
            if in_list:
                # Look for list markers
                if line.strip().startswith(('-', '*', '•', '1.', '2.', '3.')):
                    items.append(line.strip().lstrip('-*•0123456789. '))
                elif not line.strip():
                    # Empty line might indicate end of list
                    break
        
        return items

class FirecrawlService:
    """
    Service layer for Firecrawl integration with pricing tiers
    """
    
    def __init__(self, firecrawl: FirecrawlIntegration):
        self.firecrawl = firecrawl
        
        # Define limits per subscription plan
        self.plan_limits = {
            "free": {
                "scrape_limit": 10,  # pages per month
                "crawl_limit": 0,    # no crawling
                "search_limit": 5,   # searches per month
                "competitor_analysis": False
            },
            "bring_your_own_key": {
                "scrape_limit": 1000,
                "crawl_limit": 10,   # crawl jobs per month
                "search_limit": 100,
                "competitor_analysis": True,
                "max_competitors": 5
            },
            "platform_managed": {
                "scrape_limit": 5000,
                "crawl_limit": 50,
                "search_limit": 500,
                "competitor_analysis": True,
                "max_competitors": 10
            },
            "enterprise": {
                "scrape_limit": None,  # unlimited
                "crawl_limit": None,
                "search_limit": None,
                "competitor_analysis": True,
                "max_competitors": None
            }
        }
    
    async def scrape_for_brand_analysis(
        self,
        brand_url: str,
        subscription_plan: str
    ) -> Dict[str, Any]:
        """
        Scrape brand website for optimization analysis
        """
        
        # Check plan limits
        limits = self.plan_limits.get(subscription_plan, self.plan_limits["free"])
        
        if limits["scrape_limit"] == 0:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Web scraping not available in your plan"
            )
        
        # Scrape the brand website
        scrape_options = {
            "formats": ["markdown", "html", "links"],
            "onlyMainContent": True,
            "includeTags": ["h1", "h2", "h3", "p", "meta", "title"],
            "excludeTags": ["script", "style", "nav", "footer"]
        }
        
        result = await self.firecrawl.scrape_website(brand_url, scrape_options)
        
        if result.get("success"):
            # Extract relevant data for AI optimization
            content = result.get("content", {})
            metadata = result.get("metadata", {})
            
            # Analyze content structure
            markdown_content = content.get("markdown", "")
            
            return {
                "success": True,
                "url": brand_url,
                "analysis": {
                    "title": metadata.get("title", ""),
                    "description": metadata.get("description", ""),
                    "content_length": len(markdown_content),
                    "heading_structure": self._analyze_heading_structure(markdown_content),
                    "keyword_density": self._analyze_keyword_density(markdown_content),
                    "internal_links": len([l for l in content.get("links", []) if brand_url in l]),
                    "external_links": len([l for l in content.get("links", []) if brand_url not in l]),
                    "schema_markup": self._detect_schema_markup(content.get("html", "")),
                    "meta_tags": self._extract_meta_tags(content.get("html", ""))
                },
                "recommendations": self._generate_seo_recommendations(content, metadata)
            }
        else:
            return result
    
    async def analyze_competitor_landscape(
        self,
        brand_name: str,
        competitor_urls: List[str],
        subscription_plan: str
    ) -> Dict[str, Any]:
        """
        Analyze competitor websites for AI optimization insights
        """
        
        limits = self.plan_limits.get(subscription_plan, self.plan_limits["free"])
        
        if not limits.get("competitor_analysis", False):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Competitor analysis not available in your plan"
            )
        
        # Limit number of competitors based on plan
        max_competitors = limits.get("max_competitors")
        if max_competitors and len(competitor_urls) > max_competitors:
            competitor_urls = competitor_urls[:max_competitors]
        
        # Analyze competitors
        brand_keywords = self._generate_brand_keywords(brand_name)
        results = await self.firecrawl.analyze_competitor_content(
            competitor_urls,
            brand_keywords
        )
        
        # Add insights
        results["insights"] = self._generate_competitive_insights(
            results,
            brand_name
        )
        
        return results
    
    async def crawl_site_structure(
        self,
        brand_url: str,
        subscription_plan: str
    ) -> Dict[str, Any]:
        """
        Crawl entire website structure for comprehensive analysis
        """
        
        limits = self.plan_limits.get(subscription_plan, self.plan_limits["free"])
        
        if not limits.get("crawl_limit") or limits["crawl_limit"] == 0:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Website crawling not available in your plan"
            )
        
        # Set crawl limits based on plan
        crawl_options = {
            "limit": 100 if subscription_plan != "enterprise" else 500,
            "maxDepth": 3 if subscription_plan != "enterprise" else 5,
            "includePaths": ["/"],
            "excludePaths": ["/admin", "/api", "/wp-admin"],
            "formats": ["markdown", "links"]
        }
        
        # Start crawl job
        crawl_result = await self.firecrawl.crawl_website(brand_url, crawl_options)
        
        if crawl_result.get("success"):
            job_id = crawl_result.get("jobId")
            
            # Poll for results (in production, this would be handled asynchronously)
            max_attempts = 30
            for _ in range(max_attempts):
                await asyncio.sleep(2)  # Wait 2 seconds between checks
                
                status = await self.firecrawl.get_crawl_status(job_id)
                
                if status.get("status") == "completed":
                    # Analyze crawled data
                    pages = status.get("data", [])
                    
                    return {
                        "success": True,
                        "url": brand_url,
                        "pages_crawled": len(pages),
                        "site_structure": self._analyze_site_structure(pages),
                        "content_insights": self._analyze_content_insights(pages),
                        "seo_issues": self._detect_seo_issues(pages),
                        "ai_optimization_opportunities": self._identify_ai_opportunities(pages)
                    }
                elif status.get("status") == "failed":
                    return {
                        "success": False,
                        "error": "Crawl job failed"
                    }
            
            return {
                "success": False,
                "error": "Crawl job timed out"
            }
        else:
            return crawl_result
    
    def _analyze_heading_structure(self, content: str) -> Dict[str, int]:
        """Analyze heading structure in content"""
        structure = {
            "h1": content.count("# "),
            "h2": content.count("## "),
            "h3": content.count("### "),
            "h4": content.count("#### ")
        }
        return structure
    
    def _analyze_keyword_density(self, content: str) -> Dict[str, float]:
        """Analyze keyword density"""
        words = content.lower().split()
        word_count = len(words)
        
        if word_count == 0:
            return {}
        
        # Count word frequencies
        word_freq = {}
        for word in words:
            if len(word) > 3:  # Skip short words
                word_freq[word] = word_freq.get(word, 0) + 1
        
        # Calculate density for top keywords
        keyword_density = {}
        for word, count in sorted(word_freq.items(), key=lambda x: x[1], reverse=True)[:20]:
            keyword_density[word] = round((count / word_count) * 100, 2)
        
        return keyword_density
    
    def _detect_schema_markup(self, html_content: str) -> bool:
        """Detect if schema markup is present"""
        schema_indicators = [
            '"@context"',
            'itemscope',
            'itemtype',
            'itemprop',
            'application/ld+json'
        ]
        
        return any(indicator in html_content for indicator in schema_indicators)
    
    def _extract_meta_tags(self, html_content: str) -> Dict[str, str]:
        """Extract meta tags from HTML"""
        meta_tags = {}
        
        # Simple extraction - in production, use BeautifulSoup
        import re
        
        # Extract title
        title_match = re.search(r'<title>(.*?)</title>', html_content, re.IGNORECASE)
        if title_match:
            meta_tags["title"] = title_match.group(1)
        
        # Extract meta description
        desc_match = re.search(r'<meta\s+name="description"\s+content="([^"]*)"', html_content, re.IGNORECASE)
        if desc_match:
            meta_tags["description"] = desc_match.group(1)
        
        # Extract OG tags
        og_matches = re.findall(r'<meta\s+property="og:([^"]+)"\s+content="([^"]*)"', html_content, re.IGNORECASE)
        for prop, content in og_matches:
            meta_tags[f"og:{prop}"] = content
        
        return meta_tags
    
    def _generate_seo_recommendations(self, content: Dict, metadata: Dict) -> List[Dict[str, str]]:
        """Generate SEO recommendations based on analysis"""
        recommendations = []
        
        # Check title length
        title = metadata.get("title", "")
        if len(title) < 30:
            recommendations.append({
                "type": "title",
                "priority": "high",
                "issue": "Title too short",
                "recommendation": "Expand title to 50-60 characters for better SEO"
            })
        elif len(title) > 60:
            recommendations.append({
                "type": "title",
                "priority": "medium",
                "issue": "Title too long",
                "recommendation": "Shorten title to under 60 characters"
            })
        
        # Check description
        description = metadata.get("description", "")
        if not description:
            recommendations.append({
                "type": "meta_description",
                "priority": "high",
                "issue": "Missing meta description",
                "recommendation": "Add a compelling meta description (150-160 characters)"
            })
        elif len(description) < 120:
            recommendations.append({
                "type": "meta_description",
                "priority": "medium",
                "issue": "Meta description too short",
                "recommendation": "Expand description to 150-160 characters"
            })
        
        # Check content structure
        markdown = content.get("markdown", "")
        if markdown.count("# ") == 0:
            recommendations.append({
                "type": "structure",
                "priority": "high",
                "issue": "No H1 heading found",
                "recommendation": "Add a clear H1 heading to structure your content"
            })
        
        return recommendations
    
    def _generate_brand_keywords(self, brand_name: str) -> List[str]:
        """Generate brand-related keywords for analysis"""
        keywords = [brand_name.lower()]
        
        # Add variations
        parts = brand_name.split()
        if len(parts) > 1:
            keywords.append(''.join(parts).lower())  # Combined
            keywords.append('-'.join(parts).lower())  # Hyphenated
            keywords.append('_'.join(parts).lower())  # Underscored
        
        return keywords
    
    def _generate_competitive_insights(self, results: Dict, brand_name: str) -> List[Dict[str, str]]:
        """Generate insights from competitor analysis"""
        insights = []
        
        summary = results.get("summary", {})
        
        if summary.get("total_mentions", 0) == 0:
            insights.append({
                "type": "visibility",
                "priority": "high",
                "insight": f"{brand_name} is not mentioned on analyzed competitor sites",
                "recommendation": "Increase brand visibility through guest posts, partnerships, or PR"
            })
        
        if summary.get("competitors_analyzed", 0) > 0:
            avg_mentions = summary.get("total_mentions", 0) / summary["competitors_analyzed"]
            if avg_mentions < 1:
                insights.append({
                    "type": "brand_awareness",
                    "priority": "medium",
                    "insight": "Low brand mention rate across competitors",
                    "recommendation": "Develop strategies to increase brand citations and mentions"
                })
        
        return insights
    
    def _analyze_site_structure(self, pages: List[Dict]) -> Dict[str, Any]:
        """Analyze website structure from crawled pages"""
        structure = {
            "total_pages": len(pages),
            "page_types": {},
            "depth_distribution": {},
            "orphan_pages": []
        }
        
        # Analyze each page
        for page in pages:
            url = page.get("url", "")
            
            # Categorize page type
            if "/product" in url or "/shop" in url:
                page_type = "product"
            elif "/blog" in url or "/post" in url:
                page_type = "blog"
            elif "/category" in url:
                page_type = "category"
            elif url.endswith("/"):
                page_type = "landing"
            else:
                page_type = "other"
            
            structure["page_types"][page_type] = structure["page_types"].get(page_type, 0) + 1
        
        return structure
    
    def _analyze_content_insights(self, pages: List[Dict]) -> Dict[str, Any]:
        """Analyze content insights from crawled pages"""
        insights = {
            "avg_content_length": 0,
            "pages_with_images": 0,
            "pages_with_videos": 0,
            "content_freshness": {}
        }
        
        total_length = 0
        for page in pages:
            content = page.get("content", "")
            total_length += len(content)
            
            # Check for media
            if "<img" in content or "![" in content:
                insights["pages_with_images"] += 1
            if "<video" in content or "youtube.com" in content:
                insights["pages_with_videos"] += 1
        
        if pages:
            insights["avg_content_length"] = total_length // len(pages)
        
        return insights
    
    def _detect_seo_issues(self, pages: List[Dict]) -> List[Dict[str, Any]]:
        """Detect SEO issues from crawled pages"""
        issues = []
        
        # Check for duplicate titles
        titles = {}
        for page in pages:
            title = page.get("metadata", {}).get("title", "")
            if title:
                if title in titles:
                    issues.append({
                        "type": "duplicate_title",
                        "severity": "high",
                        "pages": [titles[title], page.get("url", "")],
                        "title": title
                    })
                else:
                    titles[title] = page.get("url", "")
        
        # Check for missing descriptions
        missing_desc_count = 0
        for page in pages:
            if not page.get("metadata", {}).get("description"):
                missing_desc_count += 1
        
        if missing_desc_count > 0:
            issues.append({
                "type": "missing_descriptions",
                "severity": "medium",
                "count": missing_desc_count,
                "percentage": (missing_desc_count / len(pages) * 100) if pages else 0
            })
        
        return issues
    
    def _identify_ai_opportunities(self, pages: List[Dict]) -> List[Dict[str, str]]:
        """Identify AI optimization opportunities"""
        opportunities = []
        
        # Check for FAQ sections
        faq_pages = [p for p in pages if "faq" in p.get("url", "").lower()]
        if not faq_pages:
            opportunities.append({
                "type": "content",
                "opportunity": "Add FAQ section",
                "benefit": "FAQ content is highly valued by AI systems for quick answers",
                "priority": "high"
            })
        
        # Check for structured data
        pages_with_schema = sum(1 for p in pages if self._detect_schema_markup(p.get("content", "")))
        if pages_with_schema < len(pages) * 0.5:
            opportunities.append({
                "type": "technical",
                "opportunity": "Implement schema markup",
                "benefit": "Structured data helps AI systems understand and cite your content",
                "priority": "high"
            })
        
        return opportunities {
                            "success": True,
                            "url": url,
                            "title": data.get("metadata", {}).get("title"),
                            "description": data.get("metadata", {}).get("description"),
                            "content": {
                                "markdown": data.get("markdown", ""),
                                "html": data.get("html", ""),
                                "text": data.get("content", ""),
                                "links": data.get("links", [])
                            },
                            "metadata": data.get("metadata", {}),
                            "scraped_at": datetime.utcnow().isoformat()
                        }
                    else:
                        error_data = await response.text()
                        logger.error(f"Firecrawl scraping failed: {response.status} - {error_data}")
                        return {
                            "success": False,
                            "error": f"Scraping failed with status {response.status}",
                            "url": url
                        }
                        
        except asyncio.TimeoutError:
            logger.error(f"Firecrawl scraping timed out for {url}")
            return {
                "success": False,
                "error": "Scraping timed out",
                "url": url
            }
        except Exception as e:
            logger.error(f"Firecrawl scraping error: {e}")
            return {
                "success": False,
                "error": str(e),
                "url": url
            }
    
    async def crawl_website(
        self,
        url: str,
        options: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Crawl an entire website starting from a URL
        
        Args:
            url: Starting URL for crawling
            options: Crawling options
                - limit: Maximum number of pages to crawl
                - maxDepth: Maximum crawl depth
                - includePaths: Paths to include
                - excludePaths: Paths to exclude
                - allowBackwardLinks: Allow crawling parent directories
        
        Returns:
            Crawl job information
        """
        
        endpoint = f"{self.api_url}/v0/crawl"
        
        payload = {
            "url": url,
            "limit": options.get("limit", 100),
            "maxDepth": options.get("maxDepth", 3),
            "allowBackwardLinks": options.get("allowBackwardLinks", False),
            "formats": options.get("formats", ["markdown", "links"])
        }
        
        if options:
            if "includePaths" in options:
                payload["includePaths"] = options["includePaths"]
            if "excludePaths" in options:
                payload["excludePaths"] = options["excludePaths"]
        
        headers = {
            "Content-Type": "application/json"
        }
        
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    endpoint,
                    json=payload,
                    headers=headers,
                    timeout=aiohttp.ClientTimeout(total=self.timeout)
                ) as response:
                    
                    if response.status == 200:
                        data = await response.json()
                        return {
                            "success": True,
                            "jobId": data.get("jobId"),
                            "status": "started",
                            "url": url,
                            "message": "Crawl job started successfully"
                        }
                    else:
                        error_data = await response.text()
                        logger.error(f"Firecrawl crawl initiation failed: {error_data}")
                        return {
                            "success": False,
                            "error": f"Failed to start crawl job",
                            "url": url
                        }
                        
        except Exception as e:
            logger.error(f"Firecrawl crawl error: {e}")
            return {
                "success": False,
                "error": str(e),
                "url": url
            }
    
    async def get_crawl_status(self, job_id: str) -> Dict[str, Any]:
        """Get status of a crawl job"""
        
        endpoint = f"{self.api_url}/v0/crawl/status/{job_id}"
        
        headers = {}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    endpoint,
                    headers=headers,
                    timeout=aiohttp.ClientTimeout(total=10)
                ) as response:
                    
                    if response.status == 200:
                        data = await response.json()
                        return {
                            "success": True,
                            "status": data.get("status"),
                            "current": data.get("current", 0),
                            "total": data.get("total", 0),
                            "data": data.get("data", []),
                            "partial_data": data.get("partial_data", [])
                        }
                    else:
                        return {
                            "success": False,
                            "error": f"Failed to get crawl status"
                        }
                        
        except Exception as e:
            logger.error(f"Crawl status check error: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def search_website(
        self,
        url: str,
        query: str,
        options: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Search within a website using Firecrawl
        
        Args:
            url: Website URL to search
            query: Search query
            options: Search options
                - limit: Maximum results
                - depth: Search depth
        
        Returns:
            Search results
        """
        
        endpoint = f"{self.api_url}/v0/search"
        
        payload = {
            "url": url,
            "query": query,
            "limit": options.get("limit", 10) if options else 10,
            "depth": options.get("depth", 3) if options else 3
        }
        
        headers = {
            "Content-Type": "application/json"
        }
        
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    endpoint,
                    json=payload,
                    headers=headers,
                    timeout=aiohttp.ClientTimeout(total=self.timeout)
                ) as response:
                    
                    if response.status == 200:
                        data = await response.json()
                        return {
                            "success": True,
                            "query": query,
                            "results": data.get("results", []),
                            "total": len(data.get("results", []))
                        }
                    else:
                        return {
                            "success": False,
                            "error": "Search failed",
                            "query": query
                        }
                        
        except Exception as e:
            logger.error(f"Firecrawl search error: {e}")
            return {
                "success": False,
                "error": str(e),
                "query": query
            }
    
    async def extract_structured_data(
        self,
        url: str,
        schema: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Extract structured data from a webpage based on a schema
        
        Args:
            url: URL to extract data from
            schema: Extraction schema defining what to extract
        
        Returns:
            Extracted structured data
        """
        
        # First scrape the page
        scrape_result = await self.scrape_website(
            url,
            {"formats": ["html", "markdown"]}
        )
        
        if not scrape_result.get("success"):
            return scrape_result
        
        # Extract based on schema
        extracted_data = {}
        content = scrape_result.get("content", {})
        
        # Simple extraction logic - can be enhanced
        for field, config in schema.items():
            field_type = config.get("type", "text")
            selector = config.get("selector")
            
            if field_type == "text":
                # Extract text content
                extracted_data[field] = self._extract_text(
                    content.get("markdown", ""),
                    selector
                )
            elif field_type == "list":
                # Extract list items
                extracted_data[field] = self._extract_list(
                    content.get("markdown", ""),
                    selector
                )
            elif field_type == "links":
                # Extract links
                extracted_data[field] = content.get("links", [])
        
        return {
            "success": True,
            "url": url,
            "data": extracted_data,
            "extracted_at": datetime.utcnow().isoformat()
        }
    
    async def analyze_competitor_content(
        self,
        competitor_urls: List[str],
        brand_keywords: List[str]
    ) -> Dict[str, Any]:
        """
        Analyze competitor websites for brand mentions and content
        
        Args:
            competitor_urls: List of competitor URLs
            brand_keywords: Keywords to search for
        
        Returns:
            Competitor analysis results
        """
        
        results = {
            "competitors": {},
            "summary": {
                "total_mentions": 0,
                "competitors_analyzed": 0,
                "keywords_found": {}
            }
        }
        
        for url in competitor_urls:
            try:
                # Scrape competitor page
                scrape_result = await self.scrape_website(
                    url,
                    {"formats": ["markdown", "text"]}
                )
                
                if scrape_result.get("success"):
                    content = scrape_result.get("content", {})
                    text_content = content.get("text", "").lower()
                    
                    # Analyze keyword presence
                    keyword_counts = {}
                    total_mentions = 0
                    
                    for keyword in brand_keywords:
                        count = text_content.count(keyword.lower())
                        if count > 0:
                            keyword_counts[keyword] = count
                            total_mentions += count
                            
                            if keyword not in results["summary"]["keywords_found"]:
                                results["summary"]["keywords_found"][keyword] = 0
                            results["summary"]["keywords_found"][keyword] += count
                    
                    results["competitors"][url] = {
                        "success": True,
                        "title": scrape_result.get("title"),
                        "total_mentions": total_mentions,
                        "keyword_counts": keyword_counts,
                        "content_length": len(text_content),
                        "analyzed_at": datetime.utcnow().isoformat()
                    }
                    
                    results["summary"]["total_mentions"] += total_mentions
                    results["summary"]["competitors_analyzed"] += 1
                    
                else:
                    results["competitors"][url] = {
                        "success": False,
                        "error": scrape_result.get("error", "Failed to scrape")
                    }
                    
            except Exception as e:
                logger.error(f"Error analyzing competitor {url}: {e}")
                results["competitors"][url] = {
                    "success": False,
                    "error": str(e)
                }
        
        return
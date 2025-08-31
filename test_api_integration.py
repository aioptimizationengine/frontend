#!/usr/bin/env python3
"""
API Integration Test Suite
Tests all API endpoints for proper response structure and parsing
"""

import requests
import json
import sys
import time
from typing import Dict, Any

# Test configuration
BASE_URL = "http://localhost:8000"
TEST_TIMEOUT = 30

def test_health_endpoint():
    """Test health check endpoint"""
    print("🔍 Testing health endpoint...")
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=TEST_TIMEOUT)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Health check passed")
            print(f"Response structure: {json.dumps(data, indent=2)}")
            return True
        else:
            print(f"❌ Health check failed with status {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Health check error: {e}")
        return False

def test_brand_analysis_endpoint():
    """Test brand analysis endpoint"""
    print("\n🔍 Testing brand analysis endpoint...")
    
    test_payload = {
        "brand_name": "TestBrand",
        "website_url": "https://example.com",
        "product_categories": ["technology", "software"],
        "content_sample": "Test content for analysis",
        "competitor_names": ["Competitor1", "Competitor2"]
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/analyze-brand",
            json=test_payload,
            timeout=TEST_TIMEOUT
        )
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Brand analysis endpoint responded successfully")
            
            # Verify response structure
            required_fields = ["success", "data"]
            data_fields = ["analysis_id", "brand_name", "summary", "competitors_overview"]
            
            missing_fields = []
            for field in required_fields:
                if field not in data:
                    missing_fields.append(field)
            
            if data.get("success") and "data" in data:
                for field in data_fields:
                    if field not in data["data"]:
                        missing_fields.append(f"data.{field}")
            
            if missing_fields:
                print(f"⚠️ Missing fields: {missing_fields}")
            else:
                print("✅ All required response fields present")
            
            print(f"Response keys: {list(data.keys())}")
            if "data" in data:
                print(f"Data keys: {list(data['data'].keys())}")
            
            return len(missing_fields) == 0
        else:
            print(f"❌ Brand analysis failed with status {response.status_code}")
            try:
                error_data = response.json()
                print(f"Error response: {json.dumps(error_data, indent=2)}")
            except:
                print(f"Raw error response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Brand analysis error: {e}")
        return False

def test_optimization_metrics_endpoint():
    """Test optimization metrics endpoint"""
    print("\n🔍 Testing optimization metrics endpoint...")
    
    test_payload = {
        "brand_name": "TestBrand",
        "content_sample": "Test content for metrics calculation",
        "website_url": "https://example.com"
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/optimization-metrics",
            json=test_payload,
            timeout=TEST_TIMEOUT
        )
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Optimization metrics endpoint responded successfully")
            
            # Verify response structure
            required_fields = ["success", "data"]
            data_fields = ["brand_name", "metrics", "benchmarks"]
            
            missing_fields = []
            for field in required_fields:
                if field not in data:
                    missing_fields.append(field)
            
            if data.get("success") and "data" in data:
                for field in data_fields:
                    if field not in data["data"]:
                        missing_fields.append(f"data.{field}")
            
            if missing_fields:
                print(f"⚠️ Missing fields: {missing_fields}")
            else:
                print("✅ All required response fields present")
            
            return len(missing_fields) == 0
        else:
            print(f"❌ Optimization metrics failed with status {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Optimization metrics error: {e}")
        return False

def test_query_analysis_endpoint():
    """Test query analysis endpoint"""
    print("\n🔍 Testing query analysis endpoint...")
    
    test_payload = {
        "brand_name": "TestBrand",
        "product_categories": ["technology", "software"]
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/analyze-queries",
            json=test_payload,
            timeout=TEST_TIMEOUT
        )
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Query analysis endpoint responded successfully")
            
            # Verify response structure
            required_fields = ["success", "data"]
            data_fields = ["query_analysis_id", "brand_name", "summary"]
            
            missing_fields = []
            for field in required_fields:
                if field not in data:
                    missing_fields.append(field)
            
            if data.get("success") and "data" in data:
                for field in data_fields:
                    if field not in data["data"]:
                        missing_fields.append(f"data.{field}")
            
            if missing_fields:
                print(f"⚠️ Missing fields: {missing_fields}")
            else:
                print("✅ All required response fields present")
            
            return len(missing_fields) == 0
        else:
            print(f"❌ Query analysis failed with status {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Query analysis error: {e}")
        return False

def main():
    """Run all API integration tests"""
    print("🚀 Starting API Integration Tests")
    print("=" * 50)
    
    tests = [
        ("Health Check", test_health_endpoint),
        ("Brand Analysis", test_brand_analysis_endpoint),
        ("Optimization Metrics", test_optimization_metrics_endpoint),
        ("Query Analysis", test_query_analysis_endpoint)
    ]
    
    results = []
    for test_name, test_func in tests:
        print(f"\n📋 Running {test_name} test...")
        try:
            result = test_func()
            results.append((test_name, result))
            if result:
                print(f"✅ {test_name} test PASSED")
            else:
                print(f"❌ {test_name} test FAILED")
        except Exception as e:
            print(f"❌ {test_name} test ERROR: {e}")
            results.append((test_name, False))
    
    print("\n" + "=" * 50)
    print("📊 TEST RESULTS SUMMARY")
    print("=" * 50)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{test_name}: {status}")
    
    print(f"\nOverall: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! API is working correctly.")
        return 0
    else:
        print("⚠️ Some tests failed. Check the logs above for details.")
        return 1

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)

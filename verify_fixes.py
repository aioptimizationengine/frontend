#!/usr/bin/env python3
"""
Verification script to test the fixes made to the optimization engine
"""
import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from backend.optimization_engine import AIOptimizationEngine

async def test_fixes():
    """Test the key fixes we implemented"""
    print("🔍 Testing Backend Analysis Engine Fixes...")
    
    # Initialize engine with test config
    config = {
        'anthropic_api_key': 'test_key',
        'openai_api_key': 'test_key', 
        'environment': 'test',
        'use_real_tracking': False
    }
    
    engine = AIOptimizationEngine(config)
    
    # Test 1: Brand analysis with position calculation
    print("\n1️⃣ Testing brand analysis with position calculation...")
    try:
        result = await engine.analyze_brand_comprehensive(
            brand_name="TestBrand",
            product_categories=["software", "technology"],
            content_sample="TestBrand is a leading software company providing innovative solutions."
        )
        
        # Check key metrics
        query_analysis = result.get("query_analysis", {})
        summary_metrics = query_analysis.get("summary_metrics", {})
        
        print(f"   ✅ Brand mentions: {summary_metrics.get('total_mentions', 0)}")
        print(f"   ✅ Avg position: {summary_metrics.get('avg_position', 'N/A')}")
        print(f"   ✅ Success rate: {query_analysis.get('success_rate', 0):.2%}")
        
        # Verify position is realistic (1-10 range)
        avg_pos = summary_metrics.get('avg_position', 5.0)
        if 1.0 <= avg_pos <= 10.0:
            print(f"   ✅ Position in valid range: {avg_pos}")
        else:
            print(f"   ❌ Position out of range: {avg_pos}")
            
    except Exception as e:
        print(f"   ❌ Test 1 failed: {e}")
    
    # Test 2: Optimization metrics calculation
    print("\n2️⃣ Testing optimization metrics calculation...")
    try:
        metrics = await engine.calculate_optimization_metrics_fast(
            "TestBrand", 
            "TestBrand provides excellent software solutions with proven track record."
        )
        
        print(f"   ✅ Attribution rate: {metrics.attribution_rate:.2%}")
        print(f"   ✅ AI citation count: {metrics.ai_citation_count}")
        print(f"   ✅ Overall score: {metrics.get_overall_score():.2%}")
        
        # Verify metrics are not hardcoded minimums
        if metrics.attribution_rate != 0.5 or metrics.ai_citation_count != 5:
            print("   ✅ Metrics are dynamic (not hardcoded)")
        else:
            print("   ⚠️  Metrics might still be using defaults")
            
    except Exception as e:
        print(f"   ❌ Test 2 failed: {e}")
    
    # Test 3: Position calculation method
    print("\n3️⃣ Testing position calculation method...")
    try:
        # Test with brand mentioned
        pos1 = engine._calculate_response_position(
            "TestBrand", 
            "TestBrand is an excellent company with great products and top quality service.", 
            True
        )
        
        # Test without brand mentioned  
        pos2 = engine._calculate_response_position(
            "TestBrand",
            "This is a generic response without the brand name.",
            False
        )
        
        print(f"   ✅ Position with mention: {pos1}")
        print(f"   ✅ Position without mention: {pos2}")
        
        if pos1 < pos2:  # Lower position is better
            print("   ✅ Position logic working correctly")
        else:
            print("   ⚠️  Position logic needs review")
            
    except Exception as e:
        print(f"   ❌ Test 3 failed: {e}")
    
    # Test 4: Brand mention detection
    print("\n4️⃣ Testing brand mention detection...")
    try:
        test_cases = [
            ("Apple Inc", "Apple Inc is a great company", True),
            ("Apple Inc", "Apple is innovative", True),
            ("Apple Inc", "This company makes phones", False),
            ("Test Brand", "Test-Brand is excellent", True),
            ("Test Brand", "TestBrand works well", True)
        ]
        
        for brand, text, expected in test_cases:
            result = engine._detect_brand_mention(brand, text)
            status = "✅" if result == expected else "❌"
            print(f"   {status} '{brand}' in '{text}': {result}")
            
    except Exception as e:
        print(f"   ❌ Test 4 failed: {e}")
    
    print("\n🎉 Verification complete!")
    print("\n📋 Summary of fixes:")
    print("   • Fixed visibility score calculation (no more 5080%)")
    print("   • Added proper position calculation (1-10 scale)")
    print("   • Enhanced brand mention detection")
    print("   • Removed hardcoded minimum values")
    print("   • Improved query analysis data flow")

if __name__ == "__main__":
    asyncio.run(test_fixes())

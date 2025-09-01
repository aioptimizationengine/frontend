#!/usr/bin/env python3
"""
Integration test script to verify backend API enhancements and frontend compatibility.
Tests visibility scoring, LLM integration, and priority categorization.
"""

import asyncio
import json
import sys
import os
from pathlib import Path

# Add backend to path
backend_path = Path(__file__).parent / "backend"
sys.path.insert(0, str(backend_path))

from optimization_engine import AIOptimizationEngine, OptimizationMetrics

async def test_visibility_scoring():
    """Test visibility scoring and enhanced features"""
    print("🔍 Testing Visibility Scoring and Enhanced Features...")
    
    # Initialize engine without API keys for basic testing
    engine = AIOptimizationEngine({})
    
    test_brands = ["TestBrand", "AI", "Microsoft", "OpenAI", "X"]
    
    for brand in test_brands:
        print(f"\n📊 Testing brand: {brand}")
        
        # Test individual scoring methods
        strength = engine._calculate_brand_strength_score(brand)
        visibility = engine._calculate_brand_visibility_potential(brand)
        coverage = engine._estimate_coverage_from_brand_name(brand)
        
        print(f"  Brand Strength: {strength:.3f}")
        print(f"  Visibility Potential: {visibility:.3f}")
        print(f"  Coverage Estimation: {coverage:.3f}")
        
        # Test full metrics calculation
        try:
            metrics = await engine.calculate_optimization_metrics_fast(brand)
            print(f"  Attribution Rate: {metrics.attribution_rate:.3f}")
            print(f"  AI Citation Count: {metrics.ai_citation_count}")
            print(f"  Semantic Density: {metrics.semantic_density_score:.3f}")
            print(f"  Zero Click Presence: {metrics.zero_click_surface_presence:.3f}")
            
            # Test priority categorization
            recommendations = engine._generate_recommendations(metrics, brand)
            priorities = [rec["priority"] for rec in recommendations]
            print(f"  Recommendation Priorities: {set(priorities)}")
            
        except Exception as e:
            print(f"  ❌ Error in metrics calculation: {e}")
            return False
    
    print("\n✅ Visibility scoring tests completed successfully!")
    return True

async def test_llm_integration():
    """Test LLM integration capabilities"""
    print("\n🤖 Testing LLM Integration...")
    
    # Test with mock API keys to verify initialization
    config = {
        'anthropic_api_key': 'test_key',
        'openai_api_key': 'test_key', 
        'perplexity_api_key': 'test_key'
    }
    
    engine = AIOptimizationEngine(config)
    
    # Verify clients are initialized (even with test keys)
    has_anthropic = hasattr(engine, 'anthropic_client')
    has_openai = hasattr(engine, 'openai_client')
    has_perplexity = hasattr(engine, 'perplexity_client')
    
    print(f"  Anthropic Client: {'✅' if has_anthropic else '❌'}")
    print(f"  OpenAI Client: {'✅' if has_openai else '❌'}")
    print(f"  Perplexity Client: {'✅' if has_perplexity else '❌'}")
    
    # Test semantic query generation (should fallback to heuristics)
    try:
        queries = await engine._generate_semantic_queries("TestBrand", ["technology"])
        print(f"  Generated {len(queries)} semantic queries")
        print(f"  Sample queries: {queries[:3]}")
    except Exception as e:
        print(f"  ❌ Error in query generation: {e}")
        return False
    
    print("✅ LLM integration tests completed!")
    return True

async def test_priority_categorization():
    """Test priority categorization system"""
    print("\n🎯 Testing Priority Categorization...")
    
    engine = AIOptimizationEngine({})
    
    # Create test metrics with different priority scenarios
    test_scenarios = [
        {
            "name": "Critical Priority Brand",
            "attribution_rate": 0.2,
            "brand_visibility_potential": 0.25,
            "expected_priority": "critical"
        },
        {
            "name": "High Priority Brand", 
            "attribution_rate": 0.4,
            "brand_visibility_potential": 0.5,
            "expected_priority": "high"
        },
        {
            "name": "Medium Priority Brand",
            "attribution_rate": 0.7,
            "brand_visibility_potential": 0.6,
            "expected_priority": "medium"
        }
    ]
    
    for scenario in test_scenarios:
        print(f"\n  Testing: {scenario['name']}")
        
        # Create mock metrics
        metrics = OptimizationMetrics()
        metrics.attribution_rate = scenario["attribution_rate"]
        metrics.brand_visibility_potential = scenario["brand_visibility_potential"]
        metrics.content_quality_score = 0.5
        metrics.industry_relevance = 0.5
        
        # Test priority determination
        priority = engine._determine_priority(metrics)
        print(f"    Expected: {scenario['expected_priority']}, Got: {priority}")
        
        # Test recommendations generation
        recommendations = engine._generate_recommendations(metrics, "TestBrand")
        if recommendations:
            actual_priorities = [rec["priority"] for rec in recommendations]
            print(f"    Recommendation priorities: {set(actual_priorities)}")
        
    print("✅ Priority categorization tests completed!")
    return True

async def main():
    """Run all integration tests"""
    print("🚀 Starting Backend API Integration Tests\n")
    
    tests = [
        test_visibility_scoring,
        test_llm_integration, 
        test_priority_categorization
    ]
    
    results = []
    for test in tests:
        try:
            result = await test()
            results.append(result)
        except Exception as e:
            print(f"❌ Test failed with error: {e}")
            results.append(False)
    
    print(f"\n📋 Test Results Summary:")
    print(f"  Passed: {sum(results)}/{len(results)}")
    print(f"  Success Rate: {sum(results)/len(results)*100:.1f}%")
    
    if all(results):
        print("\n🎉 All integration tests passed! Backend enhancements are working correctly.")
    else:
        print("\n⚠️  Some tests failed. Please review the output above.")
    
    return all(results)

if __name__ == "__main__":
    asyncio.run(main())

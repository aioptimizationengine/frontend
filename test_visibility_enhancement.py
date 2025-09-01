#!/usr/bin/env python3
"""
Test script for enhanced brand visibility calculation
Tests both LLM-based and fallback visibility scoring
"""

import asyncio
import os
import sys
import logging
from typing import Dict, Any

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from optimization_engine import AIOptimizationEngine

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def test_visibility_calculation():
    """Test the enhanced brand visibility calculation"""
    
    # Test configuration with and without API keys
    test_configs = [
        {
            'name': 'With API Keys',
            'config': {
                'anthropic_api_key': os.getenv('ANTHROPIC_API_KEY', 'test_key'),
                'openai_api_key': os.getenv('OPENAI_API_KEY', 'test_key'),
                'perplexity_api_key': os.getenv('PERPLEXITY_API_KEY', 'test_key'),
                'product_categories': ['software', 'cloud services', 'AI tools'],
                'environment': 'test'
            }
        },
        {
            'name': 'Fallback Mode',
            'config': {
                'anthropic_api_key': None,
                'openai_api_key': None,
                'perplexity_api_key': None,
                'product_categories': ['software', 'cloud services'],
                'environment': 'test'
            }
        }
    ]
    
    # Test brands from different industries
    test_brands = [
        {'name': 'TechCorp', 'expected_industry': 'technology'},
        {'name': 'HealthPlus Medical', 'expected_industry': 'healthcare'},
        {'name': 'FinanceFirst Bank', 'expected_industry': 'finance'},
        {'name': 'GenericBusiness Solutions', 'expected_industry': 'general_business'},
        {'name': 'AI', 'expected_industry': 'technology'},  # Very short name
        {'name': 'VeryLongCompanyNameWithManyWords', 'expected_industry': 'general_business'}  # Long name
    ]
    
    print("🧪 Testing Enhanced Brand Visibility Calculation")
    print("=" * 60)
    
    for config_test in test_configs:
        print(f"\n📋 Testing: {config_test['name']}")
        print("-" * 40)
        
        try:
            # Initialize engine
            engine = AIOptimizationEngine(config_test['config'])
            
            for brand in test_brands:
                brand_name = brand['name']
                expected_industry = brand['expected_industry']
                
                print(f"\n🏢 Brand: {brand_name}")
                
                # Test visibility calculation
                try:
                    visibility_score = await engine._calculate_brand_visibility_potential(
                        brand_name, 
                        config_test['config'].get('product_categories', [])
                    )
                    
                    # Test fallback calculation directly
                    fallback_score = engine._calculate_visibility_potential_fallback(brand_name)
                    
                    # Test industry detection
                    detected_industry = engine._determine_industry_context(brand_name, [])
                    
                    print(f"  📊 Visibility Score: {visibility_score:.4f}")
                    print(f"  🔄 Fallback Score: {fallback_score:.4f}")
                    print(f"  🏭 Industry: {detected_industry} (expected: {expected_industry})")
                    
                    # Validate score ranges
                    assert 0.1 <= visibility_score <= 0.9, f"Visibility score {visibility_score} out of range"
                    assert 0.1 <= fallback_score <= 0.9, f"Fallback score {fallback_score} out of range"
                    
                    print(f"  ✅ Scores within valid range")
                    
                    # Test if LLM mode produces different results than fallback
                    if config_test['name'] == 'With API Keys' and visibility_score != fallback_score:
                        print(f"  🤖 LLM calculation differs from fallback")
                    elif config_test['name'] == 'Fallback Mode':
                        print(f"  🛡️ Using fallback calculation")
                    
                except Exception as e:
                    print(f"  ❌ Error calculating visibility for {brand_name}: {e}")
                    continue
                    
        except Exception as e:
            print(f"❌ Failed to initialize engine for {config_test['name']}: {e}")
            continue
    
    print(f"\n🧪 Testing visibility test query generation")
    print("-" * 40)
    
    try:
        engine = AIOptimizationEngine(test_configs[0]['config'])
        
        # Test query generation
        test_queries = await engine._generate_visibility_test_queries(
            "TechCorp", 
            ["software", "cloud services"]
        )
        
        print(f"📝 Generated {len(test_queries)} test queries:")
        for i, query in enumerate(test_queries[:5], 1):  # Show first 5
            print(f"  {i}. {query}")
        
        if len(test_queries) > 5:
            print(f"  ... and {len(test_queries) - 5} more")
            
        # Validate query generation
        assert len(test_queries) > 0, "No queries generated"
        assert len(test_queries) <= 15, f"Too many queries generated: {len(test_queries)}"
        print(f"  ✅ Query generation working correctly")
        
    except Exception as e:
        print(f"❌ Query generation test failed: {e}")
    
    print(f"\n🧪 Testing full metrics calculation with new visibility")
    print("-" * 40)
    
    try:
        engine = AIOptimizationEngine(test_configs[1]['config'])  # Use fallback mode for speed
        
        # Test full metrics calculation
        metrics = await engine.calculate_optimization_metrics_fast(
            brand_name="TestBrand",
            content_sample="TestBrand provides innovative software solutions for enterprises."
        )
        
        print(f"📊 Full metrics calculated successfully:")
        print(f"  🎯 Brand Visibility Potential: {metrics.brand_visibility_potential:.4f}")
        print(f"  📈 Overall Score: {metrics.get_overall_score():.4f}")
        print(f"  🏆 Performance Grade: {metrics.get_performance_grade()}")
        
        # Validate key metrics
        assert hasattr(metrics, 'brand_visibility_potential'), "Missing brand_visibility_potential"
        assert 0.0 <= metrics.brand_visibility_potential <= 1.0, "Invalid visibility potential range"
        
        print(f"  ✅ Full integration working correctly")
        
    except Exception as e:
        print(f"❌ Full metrics test failed: {e}")
    
    print(f"\n🎉 Visibility Enhancement Testing Complete!")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(test_visibility_calculation())

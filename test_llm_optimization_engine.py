"""
Comprehensive test suite for LLM-based optimization engine functions.
Tests all the new LLM-powered features including recommendations, FAQs, and roadmaps.
"""

import asyncio
import json
import os
import sys
from typing import Dict, Any, List
from unittest.mock import AsyncMock, MagicMock, patch

# Add the backend directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from optimization_engine import AIOptimizationEngine, OptimizationMetrics


class TestLLMOptimizationEngine:
    """Test suite for LLM-based optimization engine functionality."""
    
    def __init__(self):
        """Initialize test suite with mock configuration."""
        self.config = {
            'anthropic_api_key': 'test_anthropic_key_12345',
            'openai_api_key': 'test_openai_key_12345',
            'perplexity_api_key': 'test_perplexity_key_12345',
            'use_real_tracking': False
        }
        self.engine = None
        self.test_brand = "TestTech Solutions"
        self.test_metrics = None
    
    async def setup_engine(self):
        """Setup the optimization engine with mock clients."""
        print("🔧 Setting up optimization engine...")
        
        # Create engine instance
        self.engine = AIOptimizationEngine(self.config)
        
        # Create mock LLM clients
        self.engine.anthropic_client = AsyncMock()
        self.engine.openai_client = AsyncMock()
        self.engine.perplexity_client = AsyncMock()
        
        # Setup test metrics with all required fields
        self.test_metrics = OptimizationMetrics(
            # Core 12 metrics
            chunk_retrieval_frequency=0.60,
            embedding_relevance_score=0.50,
            attribution_rate=0.45,
            ai_citation_count=8,
            vector_index_presence_ratio=0.45,
            retrieval_confidence_score=0.55,
            rrf_rank_contribution=0.40,
            llm_answer_coverage=0.35,
            ai_model_crawl_success_rate=0.65,
            semantic_density_score=0.70,
            zero_click_surface_presence=0.35,
            machine_validated_authority=0.50,
            # Extended/derived fields
            brand_strength_score=0.60,
            brand_visibility_potential=0.55,
            content_quality_score=0.65,
            industry_relevance=0.60,
            amanda_crast_score=0.55
        )
        
        print("✅ Engine setup complete")
    
    async def test_llm_recommendations(self):
        """Test LLM-based priority recommendations generation."""
        print("\n📋 Testing LLM-based recommendations...")
        
        # Mock Anthropic response for recommendations
        mock_recommendations = {
            "critical": [
                {
                    "title": "Improve Brand Attribution",
                    "description": "Attribution rate is only 45%. Focus on increasing brand mentions in content.",
                    "impact": "High impact on visibility",
                    "effort": "Medium",
                    "timeline": "4-6 weeks"
                }
            ],
            "high": [
                {
                    "title": "Increase AI Citations",
                    "description": "Only 8 AI citations detected. Target 15+ for better authority.",
                    "impact": "High impact on authority",
                    "effort": "Medium", 
                    "timeline": "6-8 weeks"
                }
            ],
            "medium": [
                {
                    "title": "Enhance Content Quality",
                    "description": "Content quality at 65%. Improve depth and relevance.",
                    "impact": "Medium impact on engagement",
                    "effort": "High",
                    "timeline": "8-10 weeks"
                }
            ],
            "low": [
                {
                    "title": "Monitor Trends",
                    "description": "Track emerging industry trends and opportunities.",
                    "impact": "Long-term growth",
                    "effort": "Low",
                    "timeline": "Ongoing"
                }
            ]
        }
        
        # Mock Anthropic client response
        mock_response = MagicMock()
        mock_response.content = [MagicMock()]
        mock_response.content[0].text = json.dumps(mock_recommendations)
        self.engine.anthropic_client.messages.create.return_value = mock_response
        
        # Test recommendations generation
        try:
            recommendations = await self.engine._generate_priority_recommendations(
                self.test_metrics, self.test_brand
            )
            
            # Validate structure
            assert isinstance(recommendations, dict), "Recommendations should be a dictionary"
            assert all(key in recommendations for key in ["critical", "high", "medium", "low"]), \
                "All priority levels should be present"
            
            # Validate content
            assert len(recommendations["critical"]) > 0, "Should have critical recommendations"
            assert len(recommendations["high"]) > 0, "Should have high priority recommendations"
            
            # Validate recommendation structure
            for priority_level, recs in recommendations.items():
                for rec in recs:
                    assert "title" in rec, f"Recommendation missing title in {priority_level}"
                    assert "description" in rec, f"Recommendation missing description in {priority_level}"
                    assert "impact" in rec, f"Recommendation missing impact in {priority_level}"
                    assert "effort" in rec, f"Recommendation missing effort in {priority_level}"
                    assert "timeline" in rec, f"Recommendation missing timeline in {priority_level}"
            
            print(f"✅ LLM recommendations test passed - Generated {sum(len(recs) for recs in recommendations.values())} recommendations")
            return True
            
        except Exception as e:
            print(f"❌ LLM recommendations test failed: {e}")
            return False
    
    async def test_llm_faqs(self):
        """Test LLM-based FAQ generation."""
        print("\n❓ Testing LLM-based FAQ generation...")
        
        # Mock FAQ response
        mock_faqs = [
            {
                "question": f"What is {self.test_brand}?",
                "answer": f"{self.test_brand} is a technology company specializing in innovative software solutions for businesses."
            },
            {
                "question": f"How does {self.test_brand} work?",
                "answer": f"{self.test_brand} provides cloud-based platforms that integrate seamlessly with existing business systems."
            },
            {
                "question": f"What are the key benefits of {self.test_brand}?",
                "answer": f"{self.test_brand} offers scalability, security, and cost-effectiveness for modern businesses."
            },
            {
                "question": f"How much does {self.test_brand} cost?",
                "answer": f"{self.test_brand} offers flexible pricing plans starting from $99/month for small businesses."
            }
        ]
        
        # Mock Anthropic client response
        mock_response = MagicMock()
        mock_response.content = [MagicMock()]
        mock_response.content[0].text = json.dumps(mock_faqs)
        self.engine.anthropic_client.messages.create.return_value = mock_response
        
        try:
            faqs = await self.engine._generate_brand_faqs(self.test_brand, self.test_metrics)
            
            # Validate structure
            assert isinstance(faqs, list), "FAQs should be a list"
            assert len(faqs) > 0, "Should generate at least one FAQ"
            
            # Validate FAQ structure
            for faq in faqs:
                assert isinstance(faq, dict), "Each FAQ should be a dictionary"
                assert "question" in faq, "FAQ missing question"
                assert "answer" in faq, "FAQ missing answer"
                assert len(faq["question"]) > 0, "Question should not be empty"
                assert len(faq["answer"]) > 0, "Answer should not be empty"
                assert self.test_brand in faq["question"] or self.test_brand in faq["answer"], \
                    "FAQ should mention the brand"
            
            print(f"✅ LLM FAQ test passed - Generated {len(faqs)} FAQs")
            return True
            
        except Exception as e:
            print(f"❌ LLM FAQ test failed: {e}")
            return False
    
    async def test_llm_roadmap(self):
        """Test LLM-based implementation roadmap generation."""
        print("\n🗺️ Testing LLM-based roadmap generation...")
        
        # Mock roadmap response
        mock_roadmap = {
            "phases": [
                {
                    "name": "Phase 1: Critical Issues",
                    "duration": "4-6 weeks",
                    "focus": "Address attribution and visibility issues",
                    "key_actions": [
                        "Audit current brand presence",
                        "Implement content optimization strategy",
                        "Monitor brand mention improvements"
                    ],
                    "success_metrics": [
                        "Attribution rate > 60%",
                        "Visibility score > 70%"
                    ]
                },
                {
                    "name": "Phase 2: Authority Building",
                    "duration": "6-8 weeks",
                    "focus": "Increase AI citations and content quality",
                    "key_actions": [
                        "Create authoritative content",
                        "Build industry partnerships",
                        "Optimize for AI platforms"
                    ],
                    "success_metrics": [
                        "AI citations > 15",
                        "Content quality > 80%"
                    ]
                }
            ],
            "timeline": {
                "total_duration": "12-16 weeks",
                "milestones": [
                    {"week": 6, "milestone": "Critical issues resolved"},
                    {"week": 14, "milestone": "Authority established"}
                ]
            },
            "resources_needed": [
                "Content team",
                "SEO specialist",
                "Analytics tools"
            ],
            "success_criteria": [
                "Overall score improvement > 20%",
                "Grade advancement to B or higher"
            ]
        }
        
        # Mock test recommendations
        test_recommendations = {
            "critical": [{"title": "Test Critical", "description": "Test"}],
            "high": [{"title": "Test High", "description": "Test"}],
            "medium": [],
            "low": []
        }
        
        # Mock Anthropic client response
        mock_response = MagicMock()
        mock_response.content = [MagicMock()]
        mock_response.content[0].text = json.dumps(mock_roadmap)
        self.engine.anthropic_client.messages.create.return_value = mock_response
        
        try:
            roadmap = await self.engine._generate_implementation_roadmap(
                self.test_metrics, test_recommendations
            )
            
            # Validate structure
            assert isinstance(roadmap, dict), "Roadmap should be a dictionary"
            assert "phases" in roadmap, "Roadmap missing phases"
            assert "timeline" in roadmap, "Roadmap missing timeline"
            
            # Validate phases
            phases = roadmap["phases"]
            assert isinstance(phases, list), "Phases should be a list"
            assert len(phases) > 0, "Should have at least one phase"
            
            for phase in phases:
                assert "name" in phase, "Phase missing name"
                assert "duration" in phase, "Phase missing duration"
                assert "focus" in phase, "Phase missing focus"
                assert "key_actions" in phase, "Phase missing key_actions"
                assert "success_metrics" in phase, "Phase missing success_metrics"
            
            # Validate timeline
            timeline = roadmap["timeline"]
            assert "total_duration" in timeline, "Timeline missing total_duration"
            assert "milestones" in timeline, "Timeline missing milestones"
            
            print(f"✅ LLM roadmap test passed - Generated {len(phases)} phases")
            return True
            
        except Exception as e:
            print(f"❌ LLM roadmap test failed: {e}")
            return False
    
    async def test_strengths_weaknesses(self):
        """Test LLM-based strengths and weaknesses analysis."""
        print("\n💪 Testing strengths and weaknesses analysis...")
        
        # Mock strengths response
        mock_strengths = [
            "Strong semantic density score at 70%",
            "Good content quality foundation at 65%",
            "Solid brand strength score of 60%"
        ]
        
        # Mock weaknesses response
        mock_weaknesses = [
            "Low attribution rate needs immediate attention",
            "AI citation count below industry standards",
            "LLM answer coverage requires improvement"
        ]
        
        # Mock Anthropic responses
        strengths_response = MagicMock()
        strengths_response.content = [MagicMock()]
        strengths_response.content[0].text = json.dumps(mock_strengths)
        
        weaknesses_response = MagicMock()
        weaknesses_response.content = [MagicMock()]
        weaknesses_response.content[0].text = json.dumps(mock_weaknesses)
        
        # Setup mock to return different responses for different calls
        self.engine.anthropic_client.messages.create.side_effect = [
            strengths_response, weaknesses_response
        ]
        
        try:
            # Test strengths - these are async methods, so always await
            strengths = await self.engine._identify_strengths(self.test_metrics)
            assert isinstance(strengths, list), "Strengths should be a list"
            assert len(strengths) > 0, "Should identify at least one strength"
            
            # Test weaknesses - these are async methods, so always await
            weaknesses = await self.engine._identify_weaknesses(self.test_metrics)
            assert isinstance(weaknesses, list), "Weaknesses should be a list"
            assert len(weaknesses) > 0, "Should identify at least one weakness"
            
            print(f"✅ Strengths/weaknesses test passed - {len(strengths)} strengths, {len(weaknesses)} weaknesses")
            return True
            
        except Exception as e:
            print(f"❌ Strengths/weaknesses test failed: {e}")
            return False
    
    async def test_comprehensive_analysis(self):
        """Test the complete comprehensive analysis workflow."""
        print("\n🔍 Testing comprehensive analysis workflow...")
        
        # Mock all LLM responses for comprehensive analysis
        self.setup_comprehensive_mocks()
        
        try:
            # Run comprehensive analysis
            result = await self.engine.analyze_brand_comprehensive(
                brand_name=self.test_brand,
                website_url="https://testtech.com",
                product_categories=["software", "cloud"],
                content_sample="TestTech Solutions provides innovative cloud-based software solutions.",
                competitor_names=["CompetitorA", "CompetitorB"]
            )
            
            # Validate comprehensive result structure
            required_keys = [
                "brand_name", "analysis_date", "optimization_metrics",
                "performance_summary", "priority_recommendations",
                "semantic_queries", "query_analysis", "implementation_roadmap",
                "brand_faqs", "competitors_overview", "metadata"
            ]
            
            for key in required_keys:
                assert key in result, f"Missing key: {key}"
            
            # Validate specific components
            assert result["brand_name"] == self.test_brand
            assert isinstance(result["priority_recommendations"], dict)
            assert isinstance(result["brand_faqs"], list)
            assert isinstance(result["implementation_roadmap"], dict)
            assert len(result["semantic_queries"]) > 0
            
            print("✅ Comprehensive analysis test passed")
            return True
            
        except Exception as e:
            print(f"❌ Comprehensive analysis test failed: {e}")
            return False
    
    def setup_comprehensive_mocks(self):
        """Setup all mock responses for comprehensive analysis."""
        # Mock responses for different LLM calls
        recommendations_response = MagicMock()
        recommendations_response.content = [MagicMock()]
        recommendations_response.content[0].text = json.dumps({
            "critical": [{"title": "Test Critical", "description": "Test", "impact": "High", "effort": "Medium", "timeline": "4 weeks"}],
            "high": [{"title": "Test High", "description": "Test", "impact": "Medium", "effort": "Low", "timeline": "6 weeks"}],
            "medium": [],
            "low": []
        })
        
        faqs_response = MagicMock()
        faqs_response.content = [MagicMock()]
        faqs_response.content[0].text = json.dumps([
            {"question": f"What is {self.test_brand}?", "answer": "Test answer"}
        ])
        
        roadmap_response = MagicMock()
        roadmap_response.content = [MagicMock()]
        roadmap_response.content[0].text = json.dumps({
            "phases": [{"name": "Test Phase", "duration": "4 weeks", "focus": "Test", "key_actions": [], "success_metrics": []}],
            "timeline": {"total_duration": "12 weeks", "milestones": []}
        })
        
        strengths_response = MagicMock()
        strengths_response.content = [MagicMock()]
        strengths_response.content[0].text = json.dumps(["Test strength"])
        
        weaknesses_response = MagicMock()
        weaknesses_response.content = [MagicMock()]
        weaknesses_response.content[0].text = json.dumps(["Test weakness"])
        
        # Setup side effects for multiple calls
        self.engine.anthropic_client.messages.create.side_effect = [
            recommendations_response, faqs_response, roadmap_response,
            strengths_response, weaknesses_response
        ]
    
    async def test_fallback_mechanisms(self):
        """Test fallback mechanisms when LLM calls fail."""
        print("\n🛡️ Testing fallback mechanisms...")
        
        # Temporarily disable LLM clients
        original_anthropic = self.engine.anthropic_client
        original_openai = self.engine.openai_client
        
        self.engine.anthropic_client = None
        self.engine.openai_client = None
        
        try:
            # Test fallback recommendations
            recommendations = await self.engine._generate_priority_recommendations(
                self.test_metrics, self.test_brand
            )
            assert isinstance(recommendations, dict)
            assert all(key in recommendations for key in ["critical", "high", "medium", "low"])
            
            # Test fallback FAQs
            faqs = await self.engine._generate_brand_faqs(self.test_brand, self.test_metrics)
            assert isinstance(faqs, list)
            assert len(faqs) > 0
            
            # Test fallback roadmap
            roadmap = await self.engine._generate_implementation_roadmap(
                self.test_metrics, recommendations
            )
            assert isinstance(roadmap, dict)
            assert "phases" in roadmap
            
            print("✅ Fallback mechanisms test passed")
            return True
            
        except Exception as e:
            print(f"❌ Fallback mechanisms test failed: {e}")
            return False
        finally:
            # Restore LLM clients
            self.engine.anthropic_client = original_anthropic
            self.engine.openai_client = original_openai
    
    async def run_all_tests(self):
        """Run all tests and report results."""
        print("🚀 Starting LLM Optimization Engine Test Suite")
        print("=" * 60)
        
        await self.setup_engine()
        
        tests = [
            ("LLM Recommendations", self.test_llm_recommendations),
            ("LLM FAQs", self.test_llm_faqs),
            ("LLM Roadmap", self.test_llm_roadmap),
            ("Strengths/Weaknesses", self.test_strengths_weaknesses),
            ("Comprehensive Analysis", self.test_comprehensive_analysis),
            ("Fallback Mechanisms", self.test_fallback_mechanisms)
        ]
        
        results = []
        for test_name, test_func in tests:
            try:
                result = await test_func()
                results.append((test_name, result))
            except Exception as e:
                print(f"❌ {test_name} test crashed: {e}")
                results.append((test_name, False))
        
        # Print summary
        print("\n" + "=" * 60)
        print("📊 TEST RESULTS SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for _, result in results if result)
        total = len(results)
        
        for test_name, result in results:
            status = "✅ PASSED" if result else "❌ FAILED"
            print(f"{test_name:<25} {status}")
        
        print(f"\nOverall: {passed}/{total} tests passed ({passed/total*100:.1f}%)")
        
        if passed == total:
            print("🎉 All tests passed! LLM optimization engine is working correctly.")
        else:
            print(f"⚠️ {total - passed} test(s) failed. Please review the issues above.")
        
        return passed == total


async def main():
    """Main test runner."""
    test_suite = TestLLMOptimizationEngine()
    success = await test_suite.run_all_tests()
    return 0 if success else 1


if __name__ == "__main__":
    import sys
    exit_code = asyncio.run(main())
    sys.exit(exit_code)

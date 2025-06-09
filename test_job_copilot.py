#!/usr/bin/env python3
"""
Test script for Tildra Job Copilot API endpoints.
This script tests the job detection, resume tailoring, and application history features.
"""

import asyncio
import aiohttp
import json
from datetime import datetime
from typing import Dict, Any, Optional

class JobCopilotTester:
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.session: Optional[aiohttp.ClientSession] = None
    
    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    async def test_job_detection(self) -> bool:
        """Test the job detection endpoint."""
        print("🔍 Testing Job Detection...")
        
        try:
            # Test data for job detection
            test_data = {
                "url": "https://www.linkedin.com/jobs/view/123456789",
                "page_content": """
                Senior Software Engineer - Python/React
                TechCorp Inc.
                San Francisco, CA
                
                We are looking for an experienced Senior Software Engineer to join our team.
                
                Requirements:
                - 5+ years of experience in software development
                - Strong proficiency in Python, React, and JavaScript
                - Experience with AWS and microservices
                - Bachelor's degree in Computer Science or related field
                
                Responsibilities:
                - Design and develop scalable web applications
                - Collaborate with cross-functional teams
                - Mentor junior developers
                
                Benefits:
                - Competitive salary: $120,000 - $180,000
                - Health insurance
                - 401k matching
                """
            }
            
            async with self.session.post(
                f"{self.base_url}/api/test/job/detect",
                json=test_data,
                headers={"Content-Type": "application/json"}
            ) as response:
                if response.status == 200:
                    result = await response.json()
                    print(f"✅ Job Detection Success:")
                    print(f"   Job Detected: {result.get('job_detected')}")
                    if result.get('job_posting'):
                        job = result['job_posting']
                        print(f"   Title: {job.get('title')}")
                        print(f"   Company: {job.get('company')}")
                        print(f"   Location: {job.get('location')}")
                        print(f"   Skills: {job.get('skills', [])}")
                    print(f"   Message: {result.get('message')}")
                    return True
                else:
                    error_text = await response.text()
                    print(f"❌ Job Detection Failed: {response.status} - {error_text}")
                    return False
                    
        except Exception as e:
            print(f"❌ Job Detection Error: {e}")
            return False
    
    async def test_resume_tailoring(self) -> bool:
        """Test the resume tailoring endpoint."""
        print("\n📄 Testing Resume Tailoring...")
        
        try:
            # Test data for resume tailoring
            test_data = {
                "job_posting": {
                    "title": "Senior Software Engineer",
                    "company": "TechCorp Inc.",
                    "location": "San Francisco, CA",
                    "description": "We are looking for an experienced Senior Software Engineer with expertise in Python, React, and AWS.",
                    "skills": ["Python", "React", "JavaScript", "AWS", "Docker", "Kubernetes"],
                    "requirements": [
                        "5+ years of software development experience",
                        "Strong proficiency in Python and React",
                        "Experience with cloud platforms (AWS preferred)",
                        "Bachelor's degree in Computer Science"
                    ],
                    "salary": "$120,000 - $180,000",
                    "employment_type": "Full-time",
                    "seniority_level": "Senior",
                    "url": "https://techcorp.com/jobs/senior-engineer",
                    "platform": "company_website"
                },
                "resume_data": {
                    "name": "Jane Smith",
                    "contact": {
                        "email": "jane.smith@email.com",
                        "phone": "(555) 987-6543",
                        "location": "San Francisco, CA"
                    },
                    "experience": [
                        {
                            "title": "Software Engineer",
                            "company": "Previous Corp",
                            "skills": ["Python", "Django", "React", "PostgreSQL"]
                        },
                        {
                            "title": "Junior Developer",
                            "company": "Startup Inc",
                            "skills": ["JavaScript", "Node.js", "MongoDB"]
                        }
                    ]
                }
            }
            
            async with self.session.post(
                f"{self.base_url}/api/test/resume/tailor",
                json=test_data,
                headers={"Content-Type": "application/json"}
            ) as response:
                if response.status == 200:
                    result = await response.json()
                    print(f"✅ Resume Tailoring Success:")
                    print(f"   Optimization Score: {result.get('optimization_score', 0):.2f}")
                    print(f"   Keyword Matches: {result.get('keyword_matches', [])}")
                    print(f"   Suggestions: {len(result.get('suggested_improvements', []))} improvements")
                    print(f"   Tailoring Notes: {result.get('tailoring_notes')}")
                    
                    # Show some sample improvements
                    improvements = result.get('suggested_improvements', [])
                    if improvements:
                        print("   Sample Improvements:")
                        for i, improvement in enumerate(improvements[:3], 1):
                            print(f"     {i}. {improvement}")
                    
                    return True
                else:
                    error_text = await response.text()
                    print(f"❌ Resume Tailoring Failed: {response.status} - {error_text}")
                    return False
                    
        except Exception as e:
            print(f"❌ Resume Tailoring Error: {e}")
            return False
    
    async def test_application_history(self) -> bool:
        """Test the application history endpoint."""
        print("\n📊 Testing Application History...")
        
        try:
            async with self.session.get(
                f"{self.base_url}/api/test/applications/history?limit=10&offset=0",
                headers={"Content-Type": "application/json"}
            ) as response:
                if response.status == 200:
                    result = await response.json()
                    print(f"✅ Application History Success:")
                    print(f"   Total Applications: {result.get('total_count', 0)}")
                    
                    applications = result.get('applications', [])
                    if applications:
                        print("   Recent Applications:")
                        for i, app in enumerate(applications[:3], 1):
                            print(f"     {i}. {app.get('job_title')} at {app.get('company')}")
                            print(f"        Status: {app.get('status')}")
                            print(f"        Applied: {app.get('applied_date')}")
                    
                    return True
                else:
                    error_text = await response.text()
                    print(f"❌ Application History Failed: {response.status} - {error_text}")
                    return False
                    
        except Exception as e:
            print(f"❌ Application History Error: {e}")
            return False
    
    async def run_all_tests(self) -> None:
        """Run all job copilot tests."""
        print("🚀 Testing Tildra Job Copilot API Endpoints")
        print("=" * 50)
        
        results = []
        
        # Test each endpoint
        results.append(await self.test_job_detection())
        results.append(await self.test_resume_tailoring())
        results.append(await self.test_application_history())
        
        # Summary
        passed = sum(results)
        total = len(results)
        
        print("\n" + "=" * 50)
        print("🏁 Testing Complete!")
        print(f"   Tests Passed: {passed}/{total}")
        
        if passed == total:
            print("   🎉 All tests passed! Job Copilot API is working correctly.")
        else:
            print("   ⚠️  Some tests failed. Check the API configuration.")

async def main():
    """Main function to run the tests."""
    async with JobCopilotTester() as tester:
        await tester.run_all_tests()

if __name__ == "__main__":
    # Run the async test function
    asyncio.run(main()) 
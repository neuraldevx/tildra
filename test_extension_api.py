#!/usr/bin/env python3
"""
Test script to verify the Tildra extension API communication
"""
import asyncio
import httpx
import json
import os
from dotenv import load_dotenv

load_dotenv()

API_BASE_URL = "https://tildra.fly.dev"
TEST_TOKEN = os.getenv("TEST_CLERK_TOKEN")  # You'll need to provide this

async def test_summarize_api():
    """Test the summarize endpoint"""
    print("Testing summarize API...")
    
    test_article = """
    This is a test article about artificial intelligence and machine learning.
    AI has become increasingly important in modern technology, with applications
    ranging from natural language processing to computer vision. Machine learning
    algorithms enable computers to learn from data without being explicitly programmed.
    Deep learning, a subset of machine learning, uses neural networks with multiple
    layers to process complex patterns in data. This technology has revolutionized
    fields like image recognition, speech synthesis, and autonomous vehicles.
    """
    
    payload = {
        "article_text": test_article,
        "url": "https://example.com/test-article",
        "title": "Test Article About AI",
        "summary_length": "standard"
    }
    
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {TEST_TOKEN}" if TEST_TOKEN else ""
    }
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                f"{API_BASE_URL}/summarize",
                json=payload,
                headers=headers,
                timeout=30.0
            )
            
            print(f"Status Code: {response.status_code}")
            print(f"Response: {response.text}")
            
            if response.status_code == 200:
                data = response.json()
                print("✅ Summarize API working correctly")
                print(f"TL;DR: {data.get('tldr', 'N/A')}")
                print(f"Key Points: {data.get('key_points', [])}")
                return True
            else:
                print("❌ Summarize API failed")
                return False
                
        except Exception as e:
            print(f"❌ Error testing summarize API: {e}")
            return False

async def test_job_detect_api():
    """Test the job detection endpoint"""
    print("\nTesting job detection API...")
    
    payload = {
        "url": "https://jobs.example.com/software-engineer",
        "page_content": """
        Software Engineer Position
        Company: Tech Corp
        Location: San Francisco, CA
        
        We are looking for a talented Software Engineer to join our team.
        
        Requirements:
        - Bachelor's degree in Computer Science
        - 3+ years of experience with JavaScript, Python, or Java
        - Experience with React, Node.js, and databases
        - Strong problem-solving skills
        
        Responsibilities:
        - Develop and maintain web applications
        - Collaborate with cross-functional teams
        - Write clean, maintainable code
        - Participate in code reviews
        """
    }
    
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {TEST_TOKEN}" if TEST_TOKEN else ""
    }
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                f"{API_BASE_URL}/api/job/detect",
                json=payload,
                headers=headers,
                timeout=30.0
            )
            
            print(f"Status Code: {response.status_code}")
            print(f"Response: {response.text}")
            
            if response.status_code == 200:
                data = response.json()
                print("✅ Job detection API working correctly")
                print(f"Job Detected: {data.get('job_detected', False)}")
                if data.get('job_posting'):
                    print(f"Job Title: {data['job_posting'].get('title', 'N/A')}")
                    print(f"Company: {data['job_posting'].get('company', 'N/A')}")
                return True
            else:
                print("❌ Job detection API failed")
                return False
                
        except Exception as e:
            print(f"❌ Error testing job detection API: {e}")
            return False

async def test_health_check():
    """Test the health check endpoint"""
    print("\nTesting health check...")
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(f"{API_BASE_URL}/health", timeout=10.0)
            
            if response.status_code == 200:
                print("✅ Health check passed")
                return True
            else:
                print("❌ Health check failed")
                return False
                
        except Exception as e:
            print(f"❌ Error testing health check: {e}")
            return False

async def main():
    print("🚀 Testing Tildra Extension API Communication")
    print("=" * 50)
    
    results = []
    
    # Test health check first
    results.append(await test_health_check())
    
    # Test job detection (works without auth)
    results.append(await test_job_detect_api())
    
    # Test summarize API (requires auth)
    if TEST_TOKEN:
        results.append(await test_summarize_api())
    else:
        print("\n⚠️  Skipping summarize API test - no TEST_CLERK_TOKEN provided")
        print("To test summarize API, set TEST_CLERK_TOKEN environment variable")
    
    print("\n" + "=" * 50)
    print("📊 Test Results Summary:")
    print(f"✅ Passed: {sum(results)} tests")
    print(f"❌ Failed: {len(results) - sum(results)} tests")
    
    if all(results):
        print("🎉 All tests passed! API is working correctly.")
    else:
        print("⚠️  Some tests failed. Check the output above for details.")

if __name__ == "__main__":
    asyncio.run(main()) 
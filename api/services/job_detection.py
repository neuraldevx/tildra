"""
Job Detection Service - Core engine for identifying and extracting job information
"""
import re
import json
import logging
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from urllib.parse import urlparse, parse_qs
import httpx
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

@dataclass
class JobPosting:
    """Structured job posting data"""
    title: str
    company: str
    location: Optional[str] = None
    description: str = ""
    requirements: List[str] = None
    responsibilities: List[str] = None
    skills: List[str] = None
    salary_range: Optional[str] = None
    employment_type: Optional[str] = None
    experience_level: Optional[str] = None
    company_size: Optional[str] = None
    industry: Optional[str] = None
    url: str = ""
    posted_date: Optional[str] = None
    application_deadline: Optional[str] = None
    benefits: List[str] = None
    remote_work: Optional[bool] = None
    source_platform: str = ""
    raw_data: Dict[str, Any] = None

    def __post_init__(self):
        if self.requirements is None:
            self.requirements = []
        if self.responsibilities is None:
            self.responsibilities = []
        if self.skills is None:
            self.skills = []
        if self.benefits is None:
            self.benefits = []
        if self.raw_data is None:
            self.raw_data = {}

class JobDetectionService:
    """Universal job posting detection and extraction service"""
    
    def __init__(self):
        self.platform_detectors = {
            'linkedin.com': self._detect_linkedin,
            'indeed.com': self._detect_indeed,
            'glassdoor.com': self._detect_glassdoor,
            'boards.greenhouse.io': self._detect_greenhouse,
            'jobs.lever.co': self._detect_lever,
            'jobs.ashbyhq.com': self._detect_ashby,
            'angel.co': self._detect_angel,
            'stackoverflow.com/jobs': self._detect_stackoverflow,
            'jobs.google.com': self._detect_google_jobs,
        }
        
        # Common job-related keywords for universal detection
        self.job_indicators = [
            'job description', 'responsibilities', 'requirements', 'qualifications',
            'apply now', 'job posting', 'position', 'role', 'career', 'employment',
            'hiring', 'recruiter', 'hr', 'human resources', 'talent acquisition'
        ]
        
        # Skills extraction patterns
        self.skill_patterns = [
            r'\b(?:JavaScript|Python|Java|React|Node\.js|SQL|AWS|Docker|Kubernetes)\b',
            r'\b(?:Machine Learning|AI|Data Science|Analytics|Statistics)\b',
            r'\b(?:Agile|Scrum|DevOps|CI/CD|Git|GitHub)\b',
            r'\b(?:Leadership|Communication|Project Management|Team Management)\b'
        ]

    def detect_job_page(self, url: str, page_content: str = None) -> Optional[JobPosting]:
        """
        Detect if a URL is a job posting and extract relevant information
        """
        try:
            parsed_url = urlparse(url)
            domain = parsed_url.netloc.lower()
            
            # Check platform-specific detectors
            for platform, detector in self.platform_detectors.items():
                if platform in domain:
                    logger.info(f"Using {platform} detector for URL: {url}")
                    return detector(url, page_content)
            
            # Fall back to universal detection
            logger.info(f"Using universal detector for URL: {url}")
            return self._universal_detect(url, page_content)
            
        except Exception as e:
            logger.error(f"Error detecting job page: {e}")
            return None

    def _detect_linkedin(self, url: str, content: str = None) -> Optional[JobPosting]:
        """LinkedIn job posting detector"""
        if not re.search(r'/jobs/view/\d+', url):
            return None
            
        if not content:
            return JobPosting(
                title="LinkedIn Job",
                company="Unknown Company",
                url=url,
                source_platform="LinkedIn"
            )
        
        try:
            soup = BeautifulSoup(content, 'html.parser')
            
            # Extract job title
            title_elem = soup.find('h1', class_='t-24') or soup.find('h1')
            title = title_elem.get_text(strip=True) if title_elem else "Unknown Position"
            
            # Extract company name
            company_elem = soup.find('a', class_='ember-view') or soup.find('span', class_='topcard__flavor')
            company = company_elem.get_text(strip=True) if company_elem else "Unknown Company"
            
            # Extract description
            desc_elem = soup.find('div', class_='description__text')
            description = desc_elem.get_text(strip=True) if desc_elem else ""
            
            # Extract location
            location_elem = soup.find('span', class_='topcard__flavor--bullet')
            location = location_elem.get_text(strip=True) if location_elem else None
            
            job = JobPosting(
                title=title,
                company=company,
                location=location,
                description=description,
                url=url,
                source_platform="LinkedIn"
            )
            
            # Extract skills and requirements from description
            self._extract_skills_and_requirements(job)
            
            return job
            
        except Exception as e:
            logger.error(f"Error parsing LinkedIn job: {e}")
            return None

    def _detect_indeed(self, url: str, content: str = None) -> Optional[JobPosting]:
        """Indeed job posting detector"""
        if not re.search(r'/viewjob\?jk=|/jobs/', url):
            return None
            
        if not content:
            return JobPosting(
                title="Indeed Job",
                company="Unknown Company", 
                url=url,
                source_platform="Indeed"
            )
        
        try:
            soup = BeautifulSoup(content, 'html.parser')
            
            # Extract job title
            title_elem = soup.find('h1', {'data-testid': 'jobsearch-JobInfoHeader-title'}) or soup.find('h1')
            title = title_elem.get_text(strip=True) if title_elem else "Unknown Position"
            
            # Extract company
            company_elem = soup.find('span', {'data-testid': 'jobsearch-JobInfoHeader-companyName'})
            company = company_elem.get_text(strip=True) if company_elem else "Unknown Company"
            
            # Extract description
            desc_elem = soup.find('div', {'id': 'jobDescriptionText'})
            description = desc_elem.get_text(strip=True) if desc_elem else ""
            
            job = JobPosting(
                title=title,
                company=company,
                description=description,
                url=url,
                source_platform="Indeed"
            )
            
            self._extract_skills_and_requirements(job)
            return job
            
        except Exception as e:
            logger.error(f"Error parsing Indeed job: {e}")
            return None

    def _detect_greenhouse(self, url: str, content: str = None) -> Optional[JobPosting]:
        """Greenhouse job posting detector"""
        if 'boards.greenhouse.io' not in url:
            return None
            
        if not content:
            return JobPosting(
                title="Greenhouse Job",
                company="Unknown Company",
                url=url,
                source_platform="Greenhouse"
            )
        
        try:
            soup = BeautifulSoup(content, 'html.parser')
            
            title_elem = soup.find('h1', class_='app-title')
            title = title_elem.get_text(strip=True) if title_elem else "Unknown Position"
            
            company_elem = soup.find('span', class_='company-name')
            company = company_elem.get_text(strip=True) if company_elem else "Unknown Company"
            
            desc_elem = soup.find('div', {'id': 'content'})
            description = desc_elem.get_text(strip=True) if desc_elem else ""
            
            job = JobPosting(
                title=title,
                company=company,
                description=description,
                url=url,
                source_platform="Greenhouse"
            )
            
            self._extract_skills_and_requirements(job)
            return job
            
        except Exception as e:
            logger.error(f"Error parsing Greenhouse job: {e}")
            return None

    def _detect_glassdoor(self, url: str, content: str = None) -> Optional[JobPosting]:
        """Glassdoor job posting detector"""
        if not re.search(r'/Job/', url):
            return None
        
        return JobPosting(
            title="Glassdoor Job",
            company="Unknown Company",
            url=url,
            source_platform="Glassdoor"
        )

    def _detect_lever(self, url: str, content: str = None) -> Optional[JobPosting]:
        """Lever job posting detector"""
        if 'jobs.lever.co' not in url:
            return None
        
        return JobPosting(
            title="Lever Job",
            company="Unknown Company",
            url=url,
            source_platform="Lever"
        )

    def _detect_ashby(self, url: str, content: str = None) -> Optional[JobPosting]:
        """Ashby job posting detector"""
        if 'jobs.ashbyhq.com' not in url:
            return None
        
        return JobPosting(
            title="Ashby Job",
            company="Unknown Company",
            url=url,
            source_platform="Ashby"
        )

    def _detect_angel(self, url: str, content: str = None) -> Optional[JobPosting]:
        """AngelList job posting detector"""
        if 'angel.co' not in url:
            return None
        
        return JobPosting(
            title="AngelList Job",
            company="Unknown Company",
            url=url,
            source_platform="AngelList"
        )

    def _detect_stackoverflow(self, url: str, content: str = None) -> Optional[JobPosting]:
        """Stack Overflow Jobs detector"""
        if 'stackoverflow.com/jobs' not in url:
            return None
        
        return JobPosting(
            title="Stack Overflow Job",
            company="Unknown Company",
            url=url,
            source_platform="Stack Overflow"
        )

    def _detect_google_jobs(self, url: str, content: str = None) -> Optional[JobPosting]:
        """Google Jobs detector"""
        if 'jobs.google.com' not in url:
            return None
        
        return JobPosting(
            title="Google Jobs Listing",
            company="Unknown Company",
            url=url,
            source_platform="Google Jobs"
        )

    def _universal_detect(self, url: str, content: str = None) -> Optional[JobPosting]:
        """Universal job posting detector for unknown platforms"""
        if not content:
            return None
            
        try:
            soup = BeautifulSoup(content, 'html.parser')
            text_content = soup.get_text().lower()
            
            # Check for job-related keywords
            job_keyword_count = sum(1 for keyword in self.job_indicators if keyword in text_content)
            
            if job_keyword_count < 3:  # Threshold for job posting detection
                return None
            
            # Try to extract basic information
            title = self._extract_title_universal(soup)
            company = self._extract_company_universal(soup)
            description = soup.get_text()[:2000]  # First 2000 chars
            
            job = JobPosting(
                title=title,
                company=company,
                description=description,
                url=url,
                source_platform="Universal"
            )
            
            self._extract_skills_and_requirements(job)
            return job
            
        except Exception as e:
            logger.error(f"Error in universal detection: {e}")
            return None

    def _extract_title_universal(self, soup: BeautifulSoup) -> str:
        """Try to extract job title from universal page"""
        # Try common title selectors
        selectors = ['h1', '.job-title', '.position-title', '.role-title', 'title']
        
        for selector in selectors:
            elem = soup.select_one(selector)
            if elem:
                text = elem.get_text(strip=True)
                if len(text) > 5 and len(text) < 100:  # Reasonable title length
                    return text
        
        return "Unknown Position"

    def _extract_company_universal(self, soup: BeautifulSoup) -> str:
        """Try to extract company name from universal page"""
        # Try common company selectors
        selectors = ['.company-name', '.employer', '.organization', '.company']
        
        for selector in selectors:
            elem = soup.select_one(selector)
            if elem:
                text = elem.get_text(strip=True)
                if len(text) > 2 and len(text) < 50:  # Reasonable company name length
                    return text
        
        return "Unknown Company"

    def _extract_skills_and_requirements(self, job: JobPosting):
        """Extract skills and requirements from job description"""
        if not job.description:
            return
        
        description_lower = job.description.lower()
        
        # Extract skills using patterns
        for pattern in self.skill_patterns:
            matches = re.findall(pattern, job.description, re.IGNORECASE)
            job.skills.extend(matches)
        
        # Remove duplicates
        job.skills = list(set(job.skills))
        
        # Extract requirements (simple heuristic)
        req_section = re.search(r'requirements?:?(.*?)(?:responsibilities?:|qualifications?:|$)', 
                               description_lower, re.DOTALL | re.IGNORECASE)
        if req_section:
            req_text = req_section.group(1)
            # Split on bullet points or line breaks
            requirements = re.split(r'[•\-\*\n]', req_text)
            job.requirements = [req.strip() for req in requirements if req.strip() and len(req.strip()) > 10]
        
        # Extract responsibilities
        resp_section = re.search(r'responsibilities?:?(.*?)(?:requirements?:|qualifications?:|$)', 
                                description_lower, re.DOTALL | re.IGNORECASE)
        if resp_section:
            resp_text = resp_section.group(1)
            responsibilities = re.split(r'[•\-\*\n]', resp_text)
            job.responsibilities = [resp.strip() for resp in responsibilities if resp.strip() and len(resp.strip()) > 10]

    def extract_job_keywords(self, job: JobPosting) -> List[str]:
        """Extract important keywords for ATS optimization"""
        if not job.description:
            return []
        
        # Combine all text sources
        all_text = f"{job.title} {job.description} {' '.join(job.requirements)} {' '.join(job.responsibilities)}"
        
        # Common job-related keywords (you can expand this)
        important_keywords = [
            'experience', 'years', 'bachelor', 'master', 'degree', 'certification',
            'leadership', 'management', 'team', 'project', 'development', 'design',
            'analysis', 'strategy', 'communication', 'collaboration', 'problem solving'
        ]
        
        found_keywords = []
        for keyword in important_keywords:
            if keyword.lower() in all_text.lower():
                found_keywords.append(keyword)
        
        # Add extracted skills
        found_keywords.extend(job.skills)
        
        return list(set(found_keywords))

# Global instance
job_detector = JobDetectionService() 
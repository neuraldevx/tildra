"""
Resume Tailoring Service - AI-powered resume customization engine
"""
import json
import logging
import re
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, asdict
import httpx
from .job_detection import JobPosting

logger = logging.getLogger(__name__)

@dataclass
class ResumeSection:
    """Individual resume section data"""
    title: str
    company: Optional[str] = None
    location: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    bullets: List[str] = None
    description: Optional[str] = None

    def __post_init__(self):
        if self.bullets is None:
            self.bullets = []

@dataclass
class ResumeData:
    """Complete resume data structure"""
    name: str
    contact: Dict[str, str]
    summary: Optional[str] = None
    experience: List[ResumeSection] = None
    education: List[ResumeSection] = None
    skills: List[str] = None
    projects: List[ResumeSection] = None
    certifications: List[str] = None
    languages: List[str] = None

    def __post_init__(self):
        if self.experience is None:
            self.experience = []
        if self.education is None:
            self.education = []
        if self.skills is None:
            self.skills = []
        if self.projects is None:
            self.projects = []
        if self.certifications is None:
            self.certifications = []
        if self.languages is None:
            self.languages = []

@dataclass
class TailoredResume:
    """Tailored resume with optimization metadata"""
    resume_data: ResumeData
    job_posting: JobPosting
    optimization_score: float
    keyword_matches: List[str]
    suggested_improvements: List[str]
    tailoring_notes: str
    version_id: str

class ResumeTailoringService:
    """AI-powered resume tailoring and optimization"""
    
    def __init__(self, deepseek_api_key: str):
        self.api_key = deepseek_api_key
        self.api_url = "https://api.deepseek.com/chat/completions"
        
    async def tailor_resume(self, base_resume: ResumeData, job_posting: JobPosting) -> TailoredResume:
        """
        Tailor a resume to match a specific job posting
        """
        try:
            # For MVP, do basic keyword matching and reordering
            tailored_resume_data = self._basic_tailor_resume(base_resume, job_posting)
            
            # Calculate optimization metrics
            optimization_score = self._calculate_optimization_score(tailored_resume_data, job_posting)
            keyword_matches = self._find_keyword_matches(tailored_resume_data, job_posting)
            improvements = self._suggest_improvements(tailored_resume_data, job_posting)
            
            return TailoredResume(
                resume_data=tailored_resume_data,
                job_posting=job_posting,
                optimization_score=optimization_score,
                keyword_matches=keyword_matches,
                suggested_improvements=improvements,
                tailoring_notes=f"Tailored for {job_posting.title} at {job_posting.company}",
                version_id=f"{job_posting.company}_{job_posting.title}".replace(" ", "_").lower()
            )
            
        except Exception as e:
            logger.error(f"Error tailoring resume: {e}")
            raise

    def _basic_tailor_resume(self, resume: ResumeData, job_posting: JobPosting) -> ResumeData:
        """
        Basic resume tailoring without AI API calls
        """
        tailored_resume = ResumeData(
            name=resume.name,
            contact=resume.contact.copy(),
            summary=resume.summary,
            experience=resume.experience.copy() if resume.experience else [],
            education=resume.education.copy() if resume.education else [],
            projects=resume.projects.copy() if resume.projects else [],
            certifications=resume.certifications.copy() if resume.certifications else [],
            languages=resume.languages.copy() if resume.languages else []
        )
        
        # Reorder skills to prioritize job-relevant ones
        if resume.skills and job_posting.skills:
            job_skills_lower = [skill.lower() for skill in job_posting.skills]
            matching_skills = []
            other_skills = []
            
            for skill in resume.skills:
                if any(job_skill in skill.lower() for job_skill in job_skills_lower):
                    matching_skills.append(skill)
                else:
                    other_skills.append(skill)
            
            tailored_resume.skills = matching_skills + other_skills
        else:
            tailored_resume.skills = resume.skills.copy() if resume.skills else []
        
        return tailored_resume

    def _calculate_optimization_score(self, resume: ResumeData, job_posting: JobPosting) -> float:
        """
        Calculate how well the resume matches the job posting (0-100)
        """
        score = 0.0
        total_weight = 0.0
        
        # Check skill matches (40% weight)
        if job_posting.skills and resume.skills:
            job_skills_lower = [skill.lower() for skill in job_posting.skills]
            resume_skills_lower = [skill.lower() for skill in resume.skills]
            
            matches = sum(1 for skill in resume_skills_lower 
                         if any(job_skill in skill for job_skill in job_skills_lower))
            skill_score = (matches / len(job_skills_lower)) * 100 if job_skills_lower else 0
            score += skill_score * 0.4
            total_weight += 0.4
        
        # Check if has relevant experience (30% weight)
        if resume.experience:
            exp_score = min(len(resume.experience) * 25, 100)  # Up to 4 experiences = 100%
            score += exp_score * 0.3
            total_weight += 0.3
        
        # Check if has summary (20% weight)
        if resume.summary and len(resume.summary) > 50:
            score += 100 * 0.2
            total_weight += 0.2
        
        # Check if has education (10% weight)
        if resume.education:
            score += 100 * 0.1
            total_weight += 0.1
        
        return score / total_weight if total_weight > 0 else 0

    def _find_keyword_matches(self, resume: ResumeData, job_posting: JobPosting) -> List[str]:
        """
        Find keywords that match between resume and job posting
        """
        matches = []
        
        # Get all text from resume
        resume_text = ""
        if resume.summary:
            resume_text += resume.summary + " "
        
        for exp in resume.experience:
            if exp.bullets:
                resume_text += " ".join(exp.bullets) + " "
        
        if resume.skills:
            resume_text += " ".join(resume.skills) + " "
        
        resume_text = resume_text.lower()
        
        # Check job posting skills
        if job_posting.skills:
            for skill in job_posting.skills:
                if skill.lower() in resume_text:
                    matches.append(skill)
        
        return list(set(matches))

    def _suggest_improvements(self, resume: ResumeData, job_posting: JobPosting) -> List[str]:
        """
        Suggest improvements to better match the job posting
        """
        suggestions = []
        
        # Check for missing skills
        if job_posting.skills and resume.skills:
            resume_skills_lower = [skill.lower() for skill in resume.skills]
            missing_skills = [skill for skill in job_posting.skills 
                            if not any(skill.lower() in res_skill for res_skill in resume_skills_lower)]
            
            if missing_skills[:3]:  # Show first 3 missing skills
                suggestions.append(f"Consider highlighting: {', '.join(missing_skills[:3])}")
        
        # Check summary
        if not resume.summary or len(resume.summary) < 100:
            suggestions.append("Add a compelling professional summary")
        
        # Check experience bullets
        total_bullets = sum(len(exp.bullets) for exp in resume.experience if exp.bullets)
        if total_bullets < len(resume.experience) * 3:  # Less than 3 bullets per experience
            suggestions.append("Add more detailed bullet points to your experience")
        
        return suggestions

    async def _call_deepseek_api(self, prompt: str) -> str:
        """
        Call DeepSeek API for AI-powered content generation
        """
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}"
        }
        
        data = {
            "model": "deepseek-chat",
            "messages": [
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            "temperature": 0.3,
            "max_tokens": 1000
        }
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(self.api_url, headers=headers, json=data)
            response.raise_for_status()
            
            result = response.json()
            return result["choices"][0]["message"]["content"].strip()

    async def generate_cover_letter(self, resume: ResumeData, job_posting: JobPosting) -> str:
        """
        Generate a tailored cover letter
        """
        prompt = f"""
        Write a professional cover letter based on this resume and job posting:

        Job: {job_posting.title} at {job_posting.company}
        Job Description: {job_posting.description[:1000]}

        Candidate: {resume.name}
        Summary: {resume.summary or 'Experienced professional'}
        Key Skills: {', '.join(resume.skills[:5]) if resume.skills else 'Various technical skills'}

        Requirements:
        - 3-4 paragraphs
        - Professional but engaging tone
        - Highlight 2-3 most relevant experiences
        - Show enthusiasm for the company/role
        - Include a strong call to action
        - Don't repeat the resume verbatim

        Return only the cover letter content.
        """
        
        try:
            return await self._call_deepseek_api(prompt)
        except Exception as e:
            logger.error(f"Error generating cover letter: {e}")
            return f"""Dear Hiring Manager,

I am excited to apply for the {job_posting.title} position at {job_posting.company}. With my background in {', '.join(resume.skills[:3]) if resume.skills else 'relevant technologies'}, I am confident I would be a valuable addition to your team.

My experience aligns well with your requirements, and I am particularly drawn to {job_posting.company}'s mission and values. I would welcome the opportunity to discuss how my skills and enthusiasm can contribute to your team's success.

Thank you for your consideration.

Best regards,
{resume.name}"""

# Global instance will be created in main.py with API key
resume_tailoring_service = None 
# InterviewX

## Overview – What This Project Does

This application enables interviewers to conduct automated, AI-driven interviews using bots.  
Candidates are evaluated based on their responses and assigned a **score from 1 to 100**, helping determine their eligibility for a role.

Key capabilities include:
- AI-powered interview bots
- Automated response analysis
- Weighted scoring based on topics and criteria
- Candidate ranking and evaluation
- Integrated frontend and backend architecture

The goal is to significantly reduce manual screening time while improving consistency and objectivity in candidate evaluation.

---

## What’s Next – Planned Enhancements

The following improvements and features are planned or under consideration:

- Advanced analytics dashboard for interviewers
- More granular scoring criteria and custom weight configuration
- Interview question customization per role
- Improved UI/UX for interviewer and candidate flows
- Performance optimizations and codebase cleanup
- Authentication and role-based access control
- Deployment and environment hardening

---

## Setup & Installation

Here are the steps required to set this project up on your local machine.

### Prerequisites
- [ ] Node.js
- [ ] Package manager (npm / yarn / pnpm)
- [ ] Environment variables configured
- [ ] Database / external services access

### Installation Steps
1. In the terminal, type the command  ```npm i ``` to install all the libraries
2. Create a ```.env``` file, and create/insert the API keys necessary, following the ```.env.example``` template.
3. Type ```npm run dev``` in the terminal, and it should state: ```Server running on port (your port)```
4. While creating a Supabase database table, it must follow this format (The column values are sample values, and are not necessary)

**Table Name**: Interview_Bots

**RLS**: Disabled(for testing purposes)

| id | created_at | jobTitle | seniorityLevel | topicsWeightage | evaluationCriteria | organization | skills | interview_code |
|----|------------|----------|----------------|-----------------|--------------------|--------------|--------|----------------|
| 1  | 2026-01-05 00:21:34.193079+00 | Software Engineer | Junior | JavaScript:40%, DSA:30%, System Design:30% | Problem-solving, Code quality, Communication | Acme Corp | JavaScript, Node.js, SQL | 382942 |
| 2  | 2026-01-08 00:14:21.103079+00 | Senior Architect | Senior | APIs:35%, Databases:35%, Architecture:30% | Scalability, Optimization, Design decisions | TechLabs | Node.js, PostgreSQL, Redis | 792380 |



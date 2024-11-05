"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EXPERIENCE_LEVELS = exports.EMPLOYMENT_TYPES = exports.COMMON_EXECUTIVE_KEYWORDS = exports.USER_AGENT = exports.MAX_DEPTH = exports.MAX_CONCURRENT_REQUESTS = exports.DEFAULT_TIMEOUT = exports.JOB_RELATED_KEYWORDS = exports.CAREER_PAGE_KEYWORDS = void 0;
exports.CAREER_PAGE_KEYWORDS = [
    'careers',
    'jobs',
    'join-us',
    'join us',
    'work with us',
    'positions',
    'vacancies',
    'opportunities',
    'open positions',
];
exports.JOB_RELATED_KEYWORDS = [
    'apply now',
    'job description',
    'requirements',
    'qualifications',
    'position',
    'role',
    'employment'
];
exports.DEFAULT_TIMEOUT = 10000; // 10 seconds
exports.MAX_CONCURRENT_REQUESTS = 3;
exports.MAX_DEPTH = 2;
exports.USER_AGENT = 'Mozilla/5.0 (compatible; JobScraperBot/1.0; +http://example.com/bot)';
exports.COMMON_EXECUTIVE_KEYWORDS = [
    'CEO', 'Manager', 'Director', 'CTO', ,
    'Lead', 'CFO', 'COO', 'Chief People Officer', 'VP of Talent Acquisition',
    'VP of People', 'Chief of Staff', 'Head of Talent Acquisition,', 'Head of People', 'VP of Engineering', 'VP of Operations', 'Director of Engineering',
    'Recruiter', 'associate', 'assistant', 'intern'
];
exports.EMPLOYMENT_TYPES = [
    'full-time', 'part-time', 'contract', 'temporary', 'internship',
    'permanent', 'freelance'
];
exports.EXPERIENCE_LEVELS = [
    'entry level', 'junior', 'mid-level', 'senior', 'principal', 'staff',
    'executive', 'lead'
];

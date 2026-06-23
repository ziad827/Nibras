# Nibras Student Dashboard

A full-stack student dashboard application with community Q&A features, course management, competitions, achievements, and AI tutoring capabilities.

## API wiring by page

| Page | Primary API |
|------|-------------|
| Student Planner (`Projects/planner.html`) | `programService` → `/v1/programs/*` |
| Portfolio (`Portfolio/portfolio.html`) | `usersService.getPortfolio` → `/v1/users/:id/portfolio` |
| Levels (`Levels/level.html`) | `levelsService` → `/v1/levels/progress`, `usersService.updateStudyLevel` |
| Mentorship (`Community/mentorship.html`) | `mentorshipService` → `/api/mentorship/*` |
| Instructor signup | `instructorApplicationService` → `/api/instructor-applications/*` |
| Admin instructor apps | `/v1/admin/instructor-applications` |
| Admin mentorship | `/api/mentorship/admin/profiles` |

## Project Structure

```
NIBRAS-STUDENT-DASHBOARD/
├── client/                    # Frontend (HTML, CSS, JavaScript)
│   ├── Community/            # Community Q&A feature
│   ├── Dashboard/            # Main dashboard
│   ├── Courses/              # Course management
│   ├── Competitions/         # Coding competitions
│   ├── Achievements/         # User achievements & leaderboard
│   ├── Ai-tutor/             # AI tutoring features
│   ├── Analytics/            # Analytics & reporting
│   ├── Settings/             # User settings
│   └── Login/                # Authentication pages
```

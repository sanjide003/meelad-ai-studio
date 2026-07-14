import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'index.html'),
          login: path.resolve(__dirname, 'login.html'),
          forgotPassword: path.resolve(__dirname, 'forgot-password.html'),
          activateAccount: path.resolve(__dirname, 'activate-account.html'),
          selectFest: path.resolve(__dirname, 'select-fest.html'),
          unauthorized: path.resolve(__dirname, 'unauthorized.html'),
          adminDashboard: path.resolve(__dirname, 'admin/dashboard.html'),
          adminCertificates: path.resolve(__dirname, 'admin/certificates.html'),
          adminAnnouncements: path.resolve(__dirname, 'admin/announcements.html'),
          adminBackupRestore: path.resolve(__dirname, 'admin/backup-restore.html'),
          adminReports: path.resolve(__dirname, 'admin/reports.html'),
          adminUsers: path.resolve(__dirname, 'admin/users.html'),
          adminStudents: path.resolve(__dirname, 'admin/students.html'),
          adminStudentCreate: path.resolve(__dirname, 'admin/student-create.html'),
          adminStudentEdit: path.resolve(__dirname, 'admin/student-edit.html'),
          adminTeams: path.resolve(__dirname, 'admin/teams.html'),
          adminCategories: path.resolve(__dirname, 'admin/categories.html'),
          adminDiagnostics: path.resolve(__dirname, 'admin/public-data-diagnostics.html'),
          adminInvitations: path.resolve(__dirname, 'admin/user-invitations.html'),
          adminJudges: path.resolve(__dirname, 'admin/judges.html'),
          adminJudgeAssignments: path.resolve(__dirname, 'admin/judge-assignments.html'),
          adminMarkMonitor: path.resolve(__dirname, 'admin/mark-monitor.html'),
          adminProvisionalResults: path.resolve(__dirname, 'admin/provisional-results.html'),
          adminSubmittedMarks: path.resolve(__dirname, 'admin/submitted-marks.html'),
          adminMarkReview: path.resolve(__dirname, 'admin/mark-review.html'),
          adminResultReview: path.resolve(__dirname, 'admin/result-review.html'),
          adminResultPublish: path.resolve(__dirname, 'admin/result-publish.html'),
          adminPublishedResults: path.resolve(__dirname, 'admin/published-results.html'),
          judgeDashboard: path.resolve(__dirname, 'judge/dashboard.html'),
          judgeCompetitions: path.resolve(__dirname, 'judge/competitions.html'),
          judgeCompetitionDetails: path.resolve(__dirname, 'judge/competition-details.html'),
          judgeMarkEntry: path.resolve(__dirname, 'judge/mark-entry.html'),
          judgeDraftMarks: path.resolve(__dirname, 'judge/draft-marks.html'),
          judgeSubmittedMarks: path.resolve(__dirname, 'judge/submitted-marks.html'),
          judgeAnnouncements: path.resolve(__dirname, 'judge/announcements.html'),
          judgeProfile: path.resolve(__dirname, 'judge/profile.html'),
          teamDashboard: path.resolve(__dirname, 'team/dashboard.html'),
          teamStudents: path.resolve(__dirname, 'team/students.html'),
          teamEntries: path.resolve(__dirname, 'team/entries.html'),
          teamCompetitions: path.resolve(__dirname, 'team/competitions.html'),
          teamResults: path.resolve(__dirname, 'team/results.html'),
          teamProfile: path.resolve(__dirname, 'team/profile.html'),
          publicIndex: path.resolve(__dirname, 'public/index.html'),
          publicLatestResults: path.resolve(__dirname, 'public/latest-results.html'),
          publicLeaderboard: path.resolve(__dirname, 'public/leaderboard.html'),
          publicAnnouncements: path.resolve(__dirname, 'public/announcements.html'),
          publicOverallRanking: path.resolve(__dirname, 'public/overall-ranking.html'),
          publicArtsResults: path.resolve(__dirname, 'public/arts-results.html'),
          publicSportsResults: path.resolve(__dirname, 'public/sports-results.html'),
          publicStageResults: path.resolve(__dirname, 'public/stage-results.html'),
          publicNonStageResults: path.resolve(__dirname, 'public/non-stage-results.html'),
          publicCategoryResults: path.resolve(__dirname, 'public/category-results.html'),
          publicChampions: path.resolve(__dirname, 'public/champions.html'),
          publicSchedule: path.resolve(__dirname, 'public/schedule.html'),
          publicResultSearch: path.resolve(__dirname, 'public/result-search.html'),
          publicDownloads: path.resolve(__dirname, 'public/downloads.html'),
          publicTeamResults: path.resolve(__dirname, 'public/team-results.html'),
          publicCompetitionResults: path.resolve(__dirname, 'public/competition-results.html'),
        }
      }
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});

import os

checks = [
    ('ActivityTrackerView 0-student banner', 'src/components/views/ActivityTrackerView.jsx', 'Session Inactive: Student Count is 0'),
    ('ActivityTrackerView isZeroStudents', 'src/components/views/ActivityTrackerView.jsx', 'const isZeroStudents = totalStudents <= 0;'),
    ('ActivityTrackerView bulk action bar gated', 'src/components/views/ActivityTrackerView.jsx', 'selectedIds.length > 0 && !isZeroStudents &&'),
    ('ExecutiveDashboardView 0-student gate', 'src/components/views/ExecutiveDashboardView.jsx', 'Strict Gate: Exclude 0-student sessions from all dashboard reports'),
    ('ExecutiveDashboardView heatmap activeColleges filter', 'src/components/views/ExecutiveDashboardView.jsx', 'activeColleges.length === 0'),
    ('TopNavbar cloud pill admin-only', 'src/components/layout/TopNavbar.jsx', 'canViewAdmin &&'),
    ('App showCloudModal admin-only', 'src/App.jsx', 'showCloudModal && currentUser?.isAdmin &&'),
    ('App handleDeleteStaffUser COE protection', 'src/App.jsx', 'The Controller of Examinations account cannot be deleted'),
    ('StaffFormModal 1-COE validation', 'src/components/modals/StaffFormModal.jsx', 'Only one Controller of Examinations is permitted across the institution'),
    ('StaffFormModal demote COE check', 'src/components/modals/StaffFormModal.jsx', 'The active Controller of Examinations cannot be demoted without appointing a successor first'),
    ('StaffFormModal deactivate COE check', 'src/components/modals/StaffFormModal.jsx', 'The Controller of Examinations account cannot be deactivated'),
    ('StaffFormModal COE dropdown disabled', 'src/components/modals/StaffFormModal.jsx', 'disabled={Boolean(existingCoe && !isEditingCurrentCoe)}'),
    ('AdminPanel user table COE delete lock', 'src/components/views/AdminPanel.jsx', "u.role !== 'COE'"),
    ('computeUserActionableItems 0-student gate', 'src/utils/helpers.js', 'Strict Gate: If student count is 0, session has no active operations')
]

all_passed = True
for name, filepath, needle in checks:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    passed = needle in content
    print(f'[{ "PASS" if passed else "FAIL" }] {name}')
    if not passed:
        all_passed = False

if all_passed:
    print('\nALL 14 MODULAR REPOSITORY INTEGRITY CHECKS PASSED!')
else:
    print('\nSOME CHECKS FAILED!')

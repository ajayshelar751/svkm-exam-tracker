import os

with open('index.html.standalone.bak', 'r', encoding='utf-8') as f:
    lines = f.readlines()

def get_block(start_line_1_based, end_line_1_based):
    return "".join(lines[start_line_1_based - 1 : end_line_1_based])

# Ensure dirs
for d in [
    'src/constants', 'src/utils', 'src/services',
    'src/components/common', 'src/components/layout',
    'src/components/views', 'src/components/modals'
]:
    os.makedirs(d, exist_ok=True)

# 1. src/constants/activities.js
with open('src/constants/activities.js', 'w', encoding='utf-8') as f:
    block = get_block(145, 3396)
    # replace 'const INITIAL_ACTIVITIES =' with 'export const INITIAL_ACTIVITIES ='
    block = block.replace('const INITIAL_ACTIVITIES =', 'export const INITIAL_ACTIVITIES =', 1)
    f.write(block.strip() + "\n")
print("Generated src/constants/activities.js")

# 2. src/constants/config.js
with open('src/constants/config.js', 'w', encoding='utf-8') as f:
    colleges_block = get_block(3453, 3535)
    phases_block = get_block(3567, 3575)
    supabase_block = get_block(3734, 3738)
    
    colleges_block = colleges_block.replace('const INITIAL_COLLEGES =', 'export const INITIAL_COLLEGES =')
    colleges_block = colleges_block.replace('const INITIAL_PROGRAMS =', 'export const INITIAL_PROGRAMS =')
    colleges_block = colleges_block.replace('const INITIAL_BATCHES =', 'export const INITIAL_BATCHES =')
    colleges_block = colleges_block.replace('const INITIAL_SEMESTERS =', 'export const INITIAL_SEMESTERS =')
    colleges_block = colleges_block.replace('const INITIAL_EXAM_CYCLES =', 'export const INITIAL_EXAM_CYCLES =')
    phases_block = phases_block.replace('const INITIAL_PHASES =', 'export const INITIAL_PHASES =')
    supabase_block = supabase_block.replace('const SUPABASE_CONFIG =', 'export const SUPABASE_CONFIG =')
    supabase_block = supabase_block.replace('const FIREBASE_CONFIG =', 'export const FIREBASE_CONFIG =')
    
    f.write(f"""{colleges_block.strip()}

{phases_block.strip()}

{supabase_block.strip()}
""")
print("Generated src/constants/config.js")

# 3. src/constants/roles.js
with open('src/constants/roles.js', 'w', encoding='utf-8') as f:
    users_block = get_block(3397, 3452)
    users_block = users_block.replace('const INITIAL_USERS =', 'export const INITIAL_USERS =')
    roles_block = get_block(3740, 3756)
    roles_block = roles_block.replace('const ROLE_RANKS =', 'export const ROLE_RANKS =')
    roles_block = roles_block.replace('const ROLE_LABELS =', 'export const ROLE_LABELS =')
    f.write(f"""{roles_block.strip()}

{users_block.strip()}
""")
print("Generated src/constants/roles.js")

# 4. src/utils/crypto.js
with open('src/utils/crypto.js', 'w', encoding='utf-8') as f:
    crypto_block = get_block(3594, 3622)
    crypto_block = crypto_block.replace('async function hashPassword', 'export async function hashPassword')
    crypto_block = crypto_block.replace('async function verifyPassword', 'export async function verifyPassword')
    f.write(f"""{crypto_block.strip()}
""")
print("Generated src/utils/crypto.js")

# 5. src/utils/helpers.js
with open('src/utils/helpers.js', 'w', encoding='utf-8') as f:
    h1 = get_block(3537, 3566)
    h1 = h1.replace('function normalizeExamCycles', 'export function normalizeExamCycles')
    h1 = h1.replace('function getActivityExamScope', 'export function getActivityExamScope')
    h1 = h1.replace('function isActivityApplicableForCycle', 'export function isActivityApplicableForCycle')

    h2 = get_block(3577, 3592)
    h2 = h2.replace('function formatExamMonthYear', 'export function formatExamMonthYear')

    h3 = get_block(3623, 3731)
    h3 = h3.replace('function computeUserActionableItems', 'export function computeUserActionableItems')

    h4 = get_block(3757, 3782)
    h4 = h4.replace('function formatDateDisplay', 'export function formatDateDisplay')
    h4 = h4.replace('function getTodayYYYYMMDD', 'export function getTodayYYYYMMDD')
    h4 = h4.replace('function getContextKey', 'export function getContextKey')

    h5 = get_block(3783, 3805)
    h5 = h5.replace('function computeActivityStatus', 'export function computeActivityStatus')

    f.write(f"""import {{ ROLE_RANKS }} from '../constants/roles.js';

{h1.strip()}

{h2.strip()}

{h4.strip()}

{h5.strip()}

{h3.strip()}
""")
print("Generated src/utils/helpers.js")

# 6. src/utils/excelExport.js
with open('src/utils/excelExport.js', 'w', encoding='utf-8') as f:
    exp_block = get_block(5337, 5651)
    exp_block = exp_block.replace('function exportCurrentViewExcel', 'export function exportCurrentViewExcel')
    exp_block = exp_block.replace('function exportExecutiveDashboardExcel', 'export function exportExecutiveDashboardExcel')
    f.write(f"""import * as XLSX from 'xlsx';
import {{ formatDateDisplay }} from './helpers.js';

{exp_block.strip()}
""")
print("Generated src/utils/excelExport.js")

# 7. src/components/common/Icon.jsx
with open('src/components/common/Icon.jsx', 'w', encoding='utf-8') as f:
    icon_block = get_block(3807, 3922)
    icon_block = icon_block.replace('function Icon(', 'export default function Icon(')
    f.write(f"""import React from 'react';

{icon_block.strip()}
""")
print("Generated src/components/common/Icon.jsx")

# 8. src/components/common/ToastContainer.jsx
with open('src/components/common/ToastContainer.jsx', 'w', encoding='utf-8') as f:
    t_block = get_block(7762, 7796)
    t_block = t_block.replace('function ToastContainer(', 'export default function ToastContainer(')
    f.write(f"""import React from 'react';
import Icon from './Icon.jsx';

{t_block.strip()}
""")
print("Generated src/components/common/ToastContainer.jsx")

# 9. src/components/common/ConfirmModal.jsx
with open('src/components/common/ConfirmModal.jsx', 'w', encoding='utf-8') as f:
    c_block = get_block(7797, 7851)
    c_block = c_block.replace('function ConfirmModal(', 'export default function ConfirmModal(')
    f.write(f"""import React from 'react';
import Icon from './Icon.jsx';

{c_block.strip()}
""")
print("Generated src/components/common/ConfirmModal.jsx")

# 10. src/services/supabaseService.js
with open('src/services/supabaseService.js', 'w', encoding='utf-8') as f:
    s_block = get_block(3923, 5336)
    s_block = s_block.replace('class SupabaseService {', 'export class SupabaseService {', 1)
    # Replace window.supabase.createClient with imported or fallback
    s_block = s_block.replace(
        'const client = window.supabase.createClient(cfg.url, cfg.anonKey, {',
        'const client = (createClient || window.supabase?.createClient)(cfg.url, cfg.anonKey, {'
    )
    f.write(f"""import {{ createClient }} from '@supabase/supabase-js';
import {{ SUPABASE_CONFIG }} from '../constants/config.js';
import {{ hashPassword }} from '../utils/crypto.js';

{s_block.strip()}

export const StorageService = SupabaseService;
if (typeof window !== 'undefined') {{
  window.SupabaseService = SupabaseService;
  window.StorageService = StorageService;
}}
""")
print("Generated src/services/supabaseService.js")

# 11. src/components/modals/ChangePasswordModal.jsx
with open('src/components/modals/ChangePasswordModal.jsx', 'w', encoding='utf-8') as f:
    cp_block = get_block(5830, 5947)
    cp_block = cp_block.replace('function ChangePasswordModal(', 'export default function ChangePasswordModal(')
    f.write(f"""import React, {{ useState }} from 'react';
import Icon from '../common/Icon.jsx';
import {{ verifyPassword, hashPassword }} from '../../utils/crypto.js';

{cp_block.strip()}
""")
print("Generated src/components/modals/ChangePasswordModal.jsx")

# 12. src/components/modals/QueryModal.jsx
with open('src/components/modals/QueryModal.jsx', 'w', encoding='utf-8') as f:
    q_block = get_block(5948, 6074)
    q_block = q_block.replace('function QueryModal(', 'export default function QueryModal(')
    f.write(f"""import React, {{ useState }} from 'react';
import Icon from '../common/Icon.jsx';

{q_block.strip()}
""")
print("Generated src/components/modals/QueryModal.jsx")

# 13. src/components/modals/CloudDetailsModal.jsx
with open('src/components/modals/CloudDetailsModal.jsx', 'w', encoding='utf-8') as f:
    cd_block = get_block(6075, 6215)
    cd_block = cd_block.replace('function CloudDetailsModal(', 'export default function CloudDetailsModal(')
    f.write(f"""import React, {{ useState }} from 'react';
import Icon from '../common/Icon.jsx';
import {{ SUPABASE_CONFIG }} from '../../constants/config.js';

{cd_block.strip()}
""")
print("Generated src/components/modals/CloudDetailsModal.jsx")

# 14. src/components/modals/SapOsmExcelModal.jsx
with open('src/components/modals/SapOsmExcelModal.jsx', 'w', encoding='utf-8') as f:
    sap_block = get_block(6216, 7555)
    sap_block = sap_block.replace('function SapOsmExcelModal(', 'export default function SapOsmExcelModal(')
    f.write(f"""import React, {{ useState, useMemo }} from 'react';
import * as XLSX from 'xlsx';
import Icon from '../common/Icon.jsx';
import {{ getTodayYYYYMMDD, formatDateDisplay }} from '../../utils/helpers.js';

{sap_block.strip()}
""")
print("Generated src/components/modals/SapOsmExcelModal.jsx")

# 15. src/components/layout/TopNavbar.jsx
with open('src/components/layout/TopNavbar.jsx', 'w', encoding='utf-8') as f:
    top_block = get_block(7556, 7761)
    top_block = top_block.replace('function TopNavbar(', 'export default function TopNavbar(')
    f.write(f"""import React from 'react';
import Icon from '../common/Icon.jsx';

{top_block.strip()}
""")
print("Generated src/components/layout/TopNavbar.jsx")

# 16. src/components/modals/ActivityHistoryModal.jsx
with open('src/components/modals/ActivityHistoryModal.jsx', 'w', encoding='utf-8') as f:
    ah_block = get_block(7852, 7974)
    ah_block = ah_block.replace('function ActivityHistoryModal(', 'export default function ActivityHistoryModal(')
    f.write(f"""import React from 'react';
import Icon from '../common/Icon.jsx';
import {{ formatDateDisplay }} from '../../utils/helpers.js';

{ah_block.strip()}
""")
print("Generated src/components/modals/ActivityHistoryModal.jsx")

# 17. src/components/layout/ContextBar.jsx
with open('src/components/layout/ContextBar.jsx', 'w', encoding='utf-8') as f:
    ctx_block = get_block(7975, 8119)
    ctx_block = ctx_block.replace('function ContextBar(', 'export default function ContextBar(')
    f.write(f"""import React from 'react';
import Icon from '../common/Icon.jsx';

{ctx_block.strip()}
""")
print("Generated src/components/layout/ContextBar.jsx")

# 18. src/components/layout/HeaderMetricsCards.jsx
with open('src/components/layout/HeaderMetricsCards.jsx', 'w', encoding='utf-8') as f:
    hm_block = get_block(8120, 8336)
    hm_block = hm_block.replace('function HeaderMetricsCards(', 'export default function HeaderMetricsCards(')
    f.write(f"""import React from 'react';
import Icon from '../common/Icon.jsx';

{hm_block.strip()}
""")
print("Generated src/components/layout/HeaderMetricsCards.jsx")

# 19. src/components/views/LoginScreen.jsx
with open('src/components/views/LoginScreen.jsx', 'w', encoding='utf-8') as f:
    log_block = get_block(5652, 5829)
    log_block = log_block.replace('function LoginScreen(', 'export default function LoginScreen(')
    f.write(f"""import React, {{ useState }} from 'react';
import Icon from '../common/Icon.jsx';
import {{ verifyPassword }} from '../../utils/crypto.js';

{log_block.strip()}
""")
print("Generated src/components/views/LoginScreen.jsx")

# 20. src/components/views/ActivityTrackerView.jsx
with open('src/components/views/ActivityTrackerView.jsx', 'w', encoding='utf-8') as f:
    at_block = get_block(8337, 9335)
    at_block = at_block.replace('function ActivityTrackerView(', 'export default function ActivityTrackerView(')
    f.write(f"""import React, {{ useState, useEffect, useMemo }} from 'react';
import Icon from '../common/Icon.jsx';
import ActivityHistoryModal from '../modals/ActivityHistoryModal.jsx';
import {{ ROLE_RANKS }} from '../../constants/roles.js';
import {{ INITIAL_PHASES }} from '../../constants/config.js';
import {{
  isActivityApplicableForCycle,
  computeActivityStatus,
  getTodayYYYYMMDD,
  formatDateDisplay
}} from '../../utils/helpers.js';
import {{ exportCurrentViewExcel }} from '../../utils/excelExport.js';

{at_block.strip()}
""")
print("Generated src/components/views/ActivityTrackerView.jsx")

# 21. src/components/views/MyActionQueueView.jsx
with open('src/components/views/MyActionQueueView.jsx', 'w', encoding='utf-8') as f:
    aq_block = get_block(9336, 9614)
    aq_block = aq_block.replace('function MyActionQueueView(', 'export default function MyActionQueueView(')
    f.write(f"""import React, {{ useState, useMemo }} from 'react';
import Icon from '../common/Icon.jsx';
import {{ computeUserActionableItems, getTodayYYYYMMDD }} from '../../utils/helpers.js';

{aq_block.strip()}
""")
print("Generated src/components/views/MyActionQueueView.jsx")

# 22. src/components/views/ExecutiveDashboardView.jsx
with open('src/components/views/ExecutiveDashboardView.jsx', 'w', encoding='utf-8') as f:
    ed_block = get_block(9615, 10346)
    ed_block = ed_block.replace('function ExecutiveDashboardView(', 'export default function ExecutiveDashboardView(')
    f.write(f"""import React, {{ useState, useMemo }} from 'react';
import Icon from '../common/Icon.jsx';
import {{
  isActivityApplicableForCycle,
  computeActivityStatus,
  formatExamMonthYear,
  formatDateDisplay
}} from '../../utils/helpers.js';
import {{ exportExecutiveDashboardExcel }} from '../../utils/excelExport.js';

{ed_block.strip()}
""")
print("Generated src/components/views/ExecutiveDashboardView.jsx")

# 23. src/components/modals/StaffFormModal.jsx
with open('src/components/modals/StaffFormModal.jsx', 'w', encoding='utf-8') as f:
    sf_block = get_block(11468, 11777)
    sf_block = sf_block.replace('function StaffFormModal(', 'export default function StaffFormModal(')
    f.write(f"""import React, {{ useState }} from 'react';
import Icon from '../common/Icon.jsx';
import {{ hashPassword }} from '../../utils/crypto.js';

{sf_block.strip()}
""")
print("Generated src/components/modals/StaffFormModal.jsx")

# 24. src/components/modals/ActivityFormModal.jsx
with open('src/components/modals/ActivityFormModal.jsx', 'w', encoding='utf-8') as f:
    af_block = get_block(11778, 11955)
    af_block = af_block.replace('function ActivityFormModal(', 'export default function ActivityFormModal(')
    f.write(f"""import React, {{ useState }} from 'react';
import Icon from '../common/Icon.jsx';
import {{ ROLE_RANKS }} from '../../constants/roles.js';

{af_block.strip()}
""")
print("Generated src/components/modals/ActivityFormModal.jsx")

# 25. src/components/modals/AuditReportModal.jsx
with open('src/components/modals/AuditReportModal.jsx', 'w', encoding='utf-8') as f:
    ar_block = get_block(11956, 12234)
    ar_block = ar_block.replace('function AuditReportModal(', 'export default function AuditReportModal(')
    f.write(f"""import React, {{ useState, useMemo }} from 'react';
import Icon from '../common/Icon.jsx';
import {{ computeActivityStatus, formatDateDisplay }} from '../../utils/helpers.js';

{ar_block.strip()}
""")
print("Generated src/components/modals/AuditReportModal.jsx")

# 26. src/components/views/AdminPanel.jsx
with open('src/components/views/AdminPanel.jsx', 'w', encoding='utf-8') as f:
    adm_block = get_block(10347, 11467)
    adm_block = adm_block.replace('function AdminPanel(', 'export default function AdminPanel(')
    f.write(f"""import React, {{ useState, useMemo }} from 'react';
import Icon from '../common/Icon.jsx';
import StaffFormModal from '../modals/StaffFormModal.jsx';
import ActivityFormModal from '../modals/ActivityFormModal.jsx';
import {{ INITIAL_PHASES }} from '../../constants/config.js';
import {{ hashPassword }} from '../../utils/crypto.js';

{adm_block.strip()}
""")
print("Generated src/components/views/AdminPanel.jsx")

# 27. src/App.jsx
with open('src/App.jsx', 'w', encoding='utf-8') as f:
    app_block = get_block(12235, 13759)
    app_block = app_block.replace('function App() {', 'export default function App() {')
    f.write(f"""import React, {{ useState, useEffect, useMemo, useRef }} from 'react';
import Icon from './components/common/Icon.jsx';
import ToastContainer from './components/common/ToastContainer.jsx';
import ConfirmModal from './components/common/ConfirmModal.jsx';
import TopNavbar from './components/layout/TopNavbar.jsx';
import ContextBar from './components/layout/ContextBar.jsx';
import HeaderMetricsCards from './components/layout/HeaderMetricsCards.jsx';
import LoginScreen from './components/views/LoginScreen.jsx';
import ActivityTrackerView from './components/views/ActivityTrackerView.jsx';
import MyActionQueueView from './components/views/MyActionQueueView.jsx';
import ExecutiveDashboardView from './components/views/ExecutiveDashboardView.jsx';
import AdminPanel from './components/views/AdminPanel.jsx';
import ChangePasswordModal from './components/modals/ChangePasswordModal.jsx';
import QueryModal from './components/modals/QueryModal.jsx';
import CloudDetailsModal from './components/modals/CloudDetailsModal.jsx';
import AuditReportModal from './components/modals/AuditReportModal.jsx';
import SapOsmExcelModal from './components/modals/SapOsmExcelModal.jsx';

import {{ INITIAL_ACTIVITIES }} from './constants/activities.js';
import {{
  INITIAL_COLLEGES,
  INITIAL_PROGRAMS,
  INITIAL_BATCHES,
  INITIAL_SEMESTERS,
  INITIAL_EXAM_CYCLES,
  INITIAL_PHASES,
  SUPABASE_CONFIG,
  FIREBASE_CONFIG
}} from './constants/config.js';
import {{ INITIAL_USERS, ROLE_RANKS, ROLE_LABELS }} from './constants/roles.js';
import {{
  normalizeExamCycles,
  getActivityExamScope,
  isActivityApplicableForCycle,
  formatExamMonthYear,
  formatDateDisplay,
  getTodayYYYYMMDD,
  getContextKey,
  computeActivityStatus,
  computeUserActionableItems
}} from './utils/helpers.js';
import {{ hashPassword, verifyPassword }} from './utils/crypto.js';
import {{ SupabaseService, StorageService }} from './services/supabaseService.js';

{app_block.strip()}
""")
print("Generated src/App.jsx")

# 28. src/main.jsx
with open('src/main.jsx', 'w', encoding='utf-8') as f:
    f.write('''import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
''')
print("Generated src/main.jsx")

# 29. index.html (modern Vite entry)
with open('index.html', 'w', encoding='utf-8') as f:
    f.write('''<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>SVKM's CED — Examination Activity & Multi-Level Verification Portal</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
</head>
<body class="bg-slate-50 dark:bg-slate-950 font-sans antialiased text-slate-900 dark:text-slate-100 min-h-screen">
  <div id="root"></div>
  <script type="module" src="/src/main.jsx"></script>
</body>
</html>
''')
print("Generated modern index.html entry point")

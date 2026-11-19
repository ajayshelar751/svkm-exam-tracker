export const ROLE_RANKS = {
  ASST: 0,
  ASST_COORD: 1,
  COORD: 2,
  AR: 3,
  DY_COE: 4,
  COE: 5
};

export const ROLE_LABELS = {
  ASST: "Assistant",
  ASST_COORD: "Assistant Coordinator",
  COORD: "Coordinator",
  AR: "Assistant Registrar",
  DY_COE: "Deputy Controller of Exams",
  COE: "Controller of Examinations"
};

export const INITIAL_USERS = [
  {
    "id": "user_alka",
    "name": "Ms. Alka Shukla",
    "email": "alka.shukla@svkm.ac.in",
    "password": "Pass@123",
    "mustChangePassword": true,
    "role": "COE",
    "isAdmin": true,
    "employeeId": "EMP-CED-001",
    "sapId": "5001001",
    "workingHoursStart": "09:00",
    "workingHoursEnd": "17:30",
    "assignedColleges": [
      "ALL"
    ],
    "assignedPrograms": {
      "ALL": [
        "ALL"
      ]
    },
    "active": true
  },
  {
    "id": "user_rupesh",
    "name": "Dr. Rupesh Mundada",
    "email": "rupesh.mundada@svkm.ac.in",
    "password": "Pass@123",
    "mustChangePassword": true,
    "role": "DY_COE",
    "isAdmin": true,
    "employeeId": "EMP-CED-002",
    "sapId": "5001002",
    "workingHoursStart": "09:00",
    "workingHoursEnd": "17:30",
    "assignedColleges": [
      "ALL"
    ],
    "assignedPrograms": {
      "ALL": [
        "ALL"
      ]
    },
    "active": true
  },
  {
    "id": "user_ajay",
    "name": "Mr. Ajay Shelar",
    "email": "ajay.shelar@svkm.ac.in",
    "password": "Pass@123",
    "mustChangePassword": true,
    "role": "AR",
    "isAdmin": true,
    "employeeId": "EMP-CED-003",
    "sapId": "5001003",
    "workingHoursStart": "09:00",
    "workingHoursEnd": "17:30",
    "assignedColleges": [
      "ALL"
    ],
    "assignedPrograms": {
      "ALL": [
        "ALL"
      ]
    },
    "active": true
  }
];

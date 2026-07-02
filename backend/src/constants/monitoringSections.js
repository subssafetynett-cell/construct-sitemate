/** Keep in sync with frontend/src/constants/monitoringSections.js */
const MONITORING_SECTIONS = {
  ohs: {
    key: "ohs",
    title: "Occupational Health and Safety Monitoring",
    category: "Occupational Health and Safety Monitoring",
    concernCategories: [
      "Health & Safety concern",
      "Weekly supervisor health & safety inspection",
      "Weekly supervisor reports",
    ],
    sheqCategories: ["SHEQ Installation", "SHEQ Inspection"],
  },
  environmental: {
    key: "environmental",
    title: "Environmental Management Monitoring",
    category: "Environmental Management Monitoring",
    concernCategories: ["Sustainability concern"],
    sheqCategories: [],
  },
  quality: {
    key: "quality",
    title: "Quality Management Monitoring",
    category: "Quality Management Monitoring",
    concernCategories: ["Quality concern"],
    sheqCategories: [],
  },
  "food-safety": {
    key: "food-safety",
    title: "Food Safety Management Monitoring",
    category: "Food Safety Management Monitoring",
    concernCategories: [],
    sheqCategories: [],
  },
  lift: {
    key: "lift",
    title: "Lift Regulations Management Monitoring",
    category: "Lift Regulations Management Monitoring",
    concernCategories: [],
    sheqCategories: ["LOLER Inspection", "PUWER Inspection"],
  },
};

function getMonitoringSection(key) {
  return MONITORING_SECTIONS[key] || null;
}

module.exports = { MONITORING_SECTIONS, getMonitoringSection };

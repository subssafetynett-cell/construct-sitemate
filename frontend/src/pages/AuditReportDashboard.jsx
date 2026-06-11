import React from "react";
import {
    Box,
    Typography,
    Grid,
    Paper,
    Chip,
    Avatar,
} from "@mui/material";
import Layout from "../components/Layout";
import PageContent from "../components/PageContent";
import { useSearchParams } from "react-router-dom";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    BarChart,
    Bar,
    Legend
} from "recharts";

// Icons
import DomainIcon from "@mui/icons-material/Domain";
import PeopleOutlineIcon from "@mui/icons-material/PeopleOutline";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import GppGoodOutlinedIcon from "@mui/icons-material/GppGoodOutlined";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import FormatListBulletedIcon from "@mui/icons-material/FormatListBulleted";

// Helper for the custom card style
const StyledPaper = ({ children, sx = {}, ...props }) => (
    <Paper
        elevation={0}
        sx={{
            borderRadius: 4,
            border: "1px solid #f0f0f0",
            boxShadow: "0px 2px 10px rgba(0,0,0,0.02)",
            p: 3,
            height: "100%",
            ...sx
        }}
        {...props}
    >
        {children}
    </Paper>
);

// --- Mock Data ---

const areaChartData = [
    { name: "Jan", scheduled: 50, completed: 45 },
    { name: "Feb", scheduled: 55, completed: 52 },
    { name: "Mar", scheduled: 52, completed: 48 },
    { name: "Apr", scheduled: 60, completed: 60 },
    { name: "May", scheduled: 58, completed: 55 },
    { name: "Jun", scheduled: 65, completed: 68 },
];

const pieChartData = [
    { name: "Critical", value: 15, color: "#f44336" },
    { name: "High", value: 30, color: "#ffb300" },
    { name: "Medium", value: 40, color: "#2196f3" },
    { name: "Low", value: 15, color: "#4caf50" },
];

const barChartData = [
    { name: "Safety", value: 24, fill: "#2196f3" },
    { name: "Quality", value: 18, fill: "#2196f3" },
    { name: "Environmental", value: 12, fill: "#2196f3" },
    { name: "Maintenance", value: 8, fill: "#2196f3" },
    { name: "Other", value: 5, fill: "#2196f3" },
];

const recentActions = [
    {
        title: "Fix scaffolding issue on Block A",
        subtitle: "Manchester Central • John Smith",
        priority: "Critical",
        priorityColor: "error",
        status: "In Progress",
        statusColor: "info"
    },
    {
        title: "Update fire safety signage",
        subtitle: "London HQ • Sarah Jones",
        priority: "High",
        priorityColor: "warning",
        status: "Pending",
        statusColor: "warning"
    },
    {
        title: "Replace damaged PPE equipment",
        subtitle: "Birmingham Site • Mike Brown",
        priority: "Medium",
        priorityColor: "info",
        status: "Not Started",
        statusColor: "default"
    },
    {
        title: "Complete RAMS review",
        subtitle: "Leeds Project • Emma Wilson",
        priority: "High",
        priorityColor: "warning",
        status: "In Progress",
        statusColor: "info"
    },
    {
        title: "Toolbox talk documentation",
        subtitle: "Cardiff Site • David Lee",
        priority: "Low",
        priorityColor: "success",
        status: "Completed",
        statusColor: "success"
    }
];

const activeSites = [
    { name: "Manchester Central", assignee: "John Smith", workers: 45, compliance: 96 },
    { name: "London HQ", assignee: "Sarah Jones", workers: 32, compliance: 94 },
    { name: "Birmingham Site", assignee: "Mike Brown", workers: 28, compliance: 91 },
    { name: "Leeds Project", assignee: "Emma Wilson", workers: 22, compliance: 98 },
];

const StatCard = ({ icon: Icon, color, title, value, trend }) => {
    // Determine avatar colors based on incoming color string
    const bgColors = {
        primary: "#e3f2fd",
        success: "#e8f5e9",
        warning: "#fff8e1",
        error: "#ffebee",
    };
    const iconColors = {
        primary: "#2196f3",
        success: "#4caf50",
        warning: "#ffb300",
        error: "#f44336",
    };

    return (
        <StyledPaper sx={{ display: 'flex', alignItems: 'center', p: 2, gap: 2 }}>
            <Avatar sx={{ bgcolor: bgColors[color], color: iconColors[color], borderRadius: 3, width: 48, height: 48 }}>
                <Icon />
            </Avatar>
            <Box>
                <Typography variant="body2" color="text.secondary" fontWeight={500}>
                    {title}
                </Typography>
                <Typography variant="h5" fontWeight={700} sx={{ lineHeight: 1.2, mt: 0.5 }}>
                    {value}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                    {trend}
                </Typography>
            </Box>
        </StyledPaper>
    );
};

// Custom Tooltip for Area Chart
const CustomAreaTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <Paper elevation={3} sx={{ p: 2, borderRadius: 2, minWidth: 120 }}>
                <Typography variant="subtitle2" fontWeight={600} mb={1}>{label}</Typography>
                {payload.map((entry, index) => (
                    <Typography key={index} variant="body2" sx={{ color: entry.color, mb: 0.5 }}>
                        {entry.name} : {entry.value}
                    </Typography>
                ))}
            </Paper>
        );
    }
    return null;
};

export default function AuditReportDashboard() {
    const [searchParams] = useSearchParams();
    const search = searchParams.get("search") || "";

    const filteredActions = recentActions.filter(a => 
        a.title.toLowerCase().includes(search.toLowerCase()) || 
        a.subtitle.toLowerCase().includes(search.toLowerCase())
    );

    const filteredSites = activeSites.filter(s => 
        s.name.toLowerCase().includes(search.toLowerCase()) || 
        s.assignee.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <Layout disablePadding={true}>
            <Box sx={{ bgcolor: "#fafafa", minHeight: "100vh", width: "100%" }}>
                <PageContent>
                    
                    {/* Top Stats Row */}
                    <Grid container spacing={3} mb={4}>
                        <Grid item xs={12} sm={6} md={4} lg={2}>
                            <StatCard icon={DomainIcon} color="primary" title="Total Sites" value="24" trend="+3 this month" />
                        </Grid>
                        <Grid item xs={12} sm={6} md={4} lg={2}>
                            <StatCard icon={PeopleOutlineIcon} color="success" title="Active Users" value="156" trend="+12 this week" />
                        </Grid>
                        <Grid item xs={12} sm={6} md={4} lg={2}>
                            <StatCard icon={WarningAmberIcon} color="warning" title="Open Actions" value="42" trend="8 critical" />
                        </Grid>
                        <Grid item xs={12} sm={6} md={4} lg={2}>
                            <StatCard icon={AccessTimeIcon} color="error" title="Overdue" value="7" trend="-3 from last w..." />
                        </Grid>
                        <Grid item xs={12} sm={6} md={4} lg={2}>
                            <StatCard icon={AssignmentTurnedInIcon} color="primary" title="Inspections" value="18" trend="This week" />
                        </Grid>
                        <Grid item xs={12} sm={6} md={4} lg={2}>
                            <StatCard icon={GppGoodOutlinedIcon} color="success" title="Compliance R..." value="94%" trend="+2% this month" />
                        </Grid>
                    </Grid>

                    {/* Charts Row */}
                    <Grid container spacing={3} mb={4}>
                        {/* Area Chart */}
                        <Grid item xs={12} lg={8}>
                            <StyledPaper>
                                <Box display="flex" alignItems="center" mb={3}>
                                    <TrendingUpIcon sx={{ color: "primary.main", mr: 1 }} />
                                    <Typography variant="subtitle1" fontWeight={700}>Inspection Trends</Typography>
                                </Box>
                                <Box height={300}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={areaChartData} margin={{ top: 10, right: 30, left: -20, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="colorScheduled" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#ffb300" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="#ffb300" stopOpacity={0} />
                                                </linearGradient>
                                                <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#2196f3" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="#2196f3" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={true} horizontal={true} stroke="#eee" />
                                            <XAxis dataKey="name" axisLine={true} tickLine={false} tick={{ fill: "#888", fontSize: 12 }} />
                                            <YAxis axisLine={true} tickLine={false} tick={{ fill: "#888", fontSize: 12 }} />
                                            <RechartsTooltip content={<CustomAreaTooltip />} />
                                            <Area type="monotone" dataKey="scheduled" stroke="#ffb300" strokeWidth={2} fillOpacity={1} fill="url(#colorScheduled)" />
                                            <Area type="monotone" dataKey="completed" stroke="#2196f3" strokeWidth={2} fillOpacity={1} fill="url(#colorCompleted)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </Box>
                            </StyledPaper>
                        </Grid>

                        {/* Donut Chart */}
                        <Grid item xs={12} lg={4}>
                            <StyledPaper>
                                <Box display="flex" alignItems="center" mb={1}>
                                    <WarningAmberIcon sx={{ color: "warning.main", mr: 1 }} />
                                    <Typography variant="subtitle1" fontWeight={700}>Actions by Priority</Typography>
                                </Box>
                                <Box height={280} display="flex" flexDirection="column" alignItems="center" justifyContent="center">
                                    <ResponsiveContainer width="100%" height="80%">
                                        <PieChart>
                                            <Pie
                                                data={pieChartData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={100}
                                                paddingAngle={5}
                                                dataKey="value"
                                                stroke="none"
                                            >
                                                {pieChartData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                        </PieChart>
                                    </ResponsiveContainer>
                                    
                                    {/* Custom Legend to match image */}
                                    <Box display="flex" justifyContent="center" gap={2} mt={2}>
                                        {pieChartData.map((item, index) => (
                                            <Box key={index} display="flex" alignItems="center" gap={0.5}>
                                                <Box width={12} height={12} bgcolor={item.color} borderRadius="2px" />
                                                <Typography variant="caption" color="text.secondary">{item.name}</Typography>
                                            </Box>
                                        ))}
                                    </Box>
                                </Box>
                            </StyledPaper>
                        </Grid>
                    </Grid>

                    {/* Bottom Split Row */}
                    <Grid container spacing={3} mb={4}>
                        {/* Recent Actions List */}
                        <Grid item xs={12} lg={8}>
                            <Box>
                                <Box display="flex" alignItems="center" mb={2} px={1}>
                                    <FormatListBulletedIcon sx={{ color: "primary.main", mr: 1 }} />
                                    <Typography variant="subtitle1" fontWeight={700}>Recent Actions</Typography>
                                </Box>
                                <Box display="flex" flexDirection="column" gap={2}>
                                    {filteredActions.map((action, index) => (
                                        <Paper
                                            key={index}
                                            elevation={0}
                                            sx={{
                                                p: 2,
                                                borderRadius: 3,
                                                border: "1px solid #f0f0f0",
                                                display: "flex",
                                                justifyContent: "space-between",
                                                alignItems: "center",
                                                bgcolor: "white"
                                            }}
                                        >
                                            <Box>
                                                <Typography variant="subtitle2" fontWeight={600}>{action.title}</Typography>
                                                <Typography variant="caption" color="text.secondary">{action.subtitle}</Typography>
                                            </Box>
                                            <Box display="flex" gap={1}>
                                                <Chip 
                                                    label={action.priority} 
                                                    size="small" 
                                                    color={action.priorityColor}
                                                    variant="outlined"
                                                    sx={{ borderRadius: 2, height: 24, fontSize: '0.75rem', fontWeight: 500, border: 'none', bgcolor: `${action.priorityColor}.light`, color: `${action.priorityColor}.dark`, opacity: 0.8 }}
                                                />
                                                <Chip 
                                                    label={action.status} 
                                                    size="small" 
                                                    color={action.statusColor}
                                                    sx={{ borderRadius: 2, height: 24, fontSize: '0.75rem', fontWeight: 500, bgcolor: `${action.statusColor}.light`, color: `${action.statusColor}.dark`, ...(action.statusColor === 'default' && { bgcolor: '#f5f5f5', color: 'text.secondary' }) }}
                                                />
                                            </Box>
                                        </Paper>
                                    ))}
                                </Box>
                            </Box>
                        </Grid>

                        {/* Horizontal Bar Chart */}
                        <Grid item xs={12} lg={4}>
                            <StyledPaper>
                                <Box display="flex" alignItems="center" mb={3}>
                                    <WarningAmberIcon sx={{ color: "error.main", mr: 1 }} />
                                    <Typography variant="subtitle1" fontWeight={700}>Concerns by Category</Typography>
                                </Box>
                                <Box height={300}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart
                                            layout="vertical"
                                            data={barChartData}
                                            margin={{ top: 0, right: 20, left: 10, bottom: 0 }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" horizontal={false} vertical={true} />
                                            <XAxis type="number" tick={{ fontSize: 12, fill: '#888' }} axisLine={true} tickLine={true} />
                                            <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: '#888' }} axisLine={true} tickLine={false} width={80} />
                                            <RechartsTooltip cursor={{fill: 'transparent'}} />
                                            <Bar dataKey="value" fill="#2196f3" radius={[0, 4, 4, 0]} barSize={24} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </Box>
                            </StyledPaper>
                        </Grid>
                    </Grid>

                    {/* Active Sites Row */}
                    <Box mb={4}>
                        <Box display="flex" alignItems="center" mb={2} px={1}>
                            <DomainIcon sx={{ color: "primary.main", mr: 1 }} />
                            <Typography variant="subtitle1" fontWeight={700}>Active Sites</Typography>
                        </Box>
                        <Grid container spacing={3}>
                            {filteredSites.map((site, index) => (
                                <Grid item xs={12} sm={6} md={3} key={index}>
                                    <Paper
                                        elevation={0}
                                        sx={{
                                            p: 3,
                                            borderRadius: 4,
                                            border: "1px solid #f0f0f0",
                                            bgcolor: "#fafafa" 
                                        }}
                                    >
                                        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                                            <Typography variant="subtitle2" fontWeight={700}>{site.name}</Typography>
                                            <Chip 
                                                label="Active" 
                                                size="small" 
                                                color="success"
                                                sx={{ height: 20, fontSize: '0.7rem', fontWeight: 600, bgcolor: '#e8f5e9', color: '#2e7d32', border: '1px solid #c8e6c9' }}
                                            />
                                        </Box>
                                        <Typography variant="body2" color="text.secondary" mb={3}>{site.assignee}</Typography>
                                        
                                        <Box display="flex" justifyContent="space-between" alignItems="center">
                                            <Typography variant="caption" color="text.secondary">{site.workers} workers</Typography>
                                            <Typography variant="caption" sx={{ color: '#2e7d32', fontWeight: 600 }}>{site.compliance}% compliance</Typography>
                                        </Box>
                                    </Paper>
                                </Grid>
                            ))}
                        </Grid>
                    </Box>

                </PageContent>
            </Box>
        </Layout>
    );
}

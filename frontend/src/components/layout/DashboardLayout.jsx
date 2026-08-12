import { useState } from "react"

import Sidebar from "./Sidebar"


function DashboardLayout({
    children,
}) {
    const [
        sidebarCollapsed,
        setSidebarCollapsed,
    ] = useState(false)


    function toggleSidebar() {
        setSidebarCollapsed(
            (currentValue) => !currentValue
        )
    }


    return (
        <div className="dashboard-layout">

            <Sidebar
                collapsed={sidebarCollapsed}
                onToggle={toggleSidebar}
            />

            <main className="dashboard-main">
                {children}
            </main>

        </div>
    )
}


export default DashboardLayout
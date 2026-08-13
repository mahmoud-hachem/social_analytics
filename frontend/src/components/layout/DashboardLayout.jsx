import {
    useState,
} from "react"

import Sidebar
    from "./Sidebar"


function DashboardLayout({
    children,
    activePage,
    onPageChange,
}) {
    const [
        sidebarCollapsed,
        setSidebarCollapsed,
    ] = useState(false)


    function toggleSidebar() {
        setSidebarCollapsed(
            (currentValue) =>
                !currentValue
        )
    }


    return (
        <div className="dashboard-layout">

            <Sidebar
                collapsed={sidebarCollapsed}
                onToggle={toggleSidebar}
                activePage={activePage}
                onPageChange={onPageChange}
            />


            <main className="dashboard-main">
                {children}
            </main>

        </div>
    )
}


export default DashboardLayout
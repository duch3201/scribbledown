var sidebarClosed = true
function showSidebar() {
    if (sidebarClosed) {
        document.getElementById("sidebar").style.display = "block";
        sidebarClosed = false;
    } else {
        document.getElementById("sidebar").style.display = "none";
        sidebarClosed = true;
    }
}
var sidebarClosed = true
function showSidebar() {
    if (sidebarClosed) {
        document.getElementById("sidebar").style.display = "block";
        // document.getElementsByTagName("main")[0].style.display= "none";
        sidebarClosed = false;
    } else {
        document.getElementById("sidebar").style.display = "none";
        sidebarClosed = true;
    }
    // document.getElementById("sidebar").style.display = "block";
}
// function hideSidebar() {
//     document.getElementById("sidebar").style.display = "none";
// }
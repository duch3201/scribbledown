document.addEventListener('DOMContentLoaded', function() {
    const nav = document.getElementById("nav");
    const ul = nav.querySelector('ul');
    
    // Get all h3 and ol elements
    const h3Elements = ul.querySelectorAll('h3');
    const olElements = ul.querySelectorAll('ol');

    // Create first wrapper div and move first pair
    const firstDiv = document.createElement('div');
    firstDiv.appendChild(h3Elements[0]);
    firstDiv.appendChild(olElements[0]);

    // Create second wrapper div and move second pair
    const secondDiv = document.createElement('div');
    secondDiv.appendChild(h3Elements[1]);
    secondDiv.appendChild(olElements[1]);

    // Clear the ul and append the new wrapped pairs
    ul.innerHTML = '';
    ul.appendChild(firstDiv);
    ul.appendChild(secondDiv);
});

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
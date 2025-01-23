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

// const commentBtn = document.getElementById("commentBtn");

// document.addEventListener('DOMContentLoaded', async () => {


//     document.getElementById("nav").innerHTML = processedLinks.join('');
//     // document.getElementById("subtitle")
//     console.error(frontmatter);
//     Object.keys(frontmatter).forEach(fm => {
//         console.log(fm)
//         // if (fm == "readingTime") {
//         //     const readingTime = document.createElement("p").innerHTML = fm.readingTime;
//         //     readingTime.className = "reading-time subtitle-text";
//         //     document.getElementById("subtitle").appendChild(readingTime);
//         // }
//         const element = document.createElement("p");
//         element.innerText = fm;
//         element.className = "subtitle-text";
//         document.getElementById("subtitle").appendChild(element);

//     })
// })


async function callPluginFunction(pluginName, functionName, args = {}) {
    try {
        const response = await fetch(`/plugin/${pluginName}/${functionName}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(args)
        });
        return await response.json();
    } catch (error) {
        console.error('Plugin function call failed:', error);
        throw error;
    }
}
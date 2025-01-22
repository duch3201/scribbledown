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


// code for the comment plugin

// commentBtn.addEventListener('click', async () => {
//     // const name = document.getElementById("name").value;
//     const name = "user"
//     const comment = document.getElementById("commentInput").value;
//     const response = await callPluginFunction('commentsPlugin', 'addComment', {name, comment});
//     console.log(response);
//     // document.getElementById("name").value = '';
//     document.getElementById("commentInput").value = '';
//     await callPluginFunction('commentsPlugin', 'rebuildPage', {name: ''});
// });

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
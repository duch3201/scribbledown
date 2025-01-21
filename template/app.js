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

const commentBtn = document.getElementById("commentBtn");

commentBtn.addEventListener('click', async () => {
    // const name = document.getElementById("name").value;
    const name = "user"
    const comment = document.getElementById("commentInput").value;
    const response = await callPluginFunction('commentsPlugin', 'addComment', {name, comment});
    console.log(response);
    // document.getElementById("name").value = '';
    document.getElementById("commentInput").value = '';
    await callPluginFunction('commentsPlugin', 'rebuildPage', {name: ''});
});

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
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

    const commentBtn = document.getElementById('commentBtn');

    // code for the comment plugin
    commentBtn.addEventListener('click', async () => {
        // const name = document.getElementById("name").value;
        const name = "user"
        const comment = document.getElementById("commentInput").value;
        let page = window.location.pathname
        page = decodeURIComponent(page) 
        const response = await callPluginFunction('commentsPluginV2', 'addComment', {name, comment, page});
        console.log(response);
        // document.getElementById("name").value = '';
        // document.getElementById("commentInput").value = '';
        // // await callPluginFunction('commentsPlugin', 'rebuildPage', {name: ''});
        // this.getElementById('comments').innerHTML = '';
        // let comments = await callPluginFunction('commentsPlugin', 'getComments');
        // comments = comments.data
        // console.log(comments);
        // Object.keys(comments).forEach(page => {
        //     console.log(comments[page]);
        //     comments[page].forEach(comment => {
        //         document.getElementById('comments').innerHTML += `
        //             <div class="comment">
        //                 <p>${comment.comment}</p>
        //                 <p>By ${comment.name} on ${new Date(comment.date).toDateString()}</p>
        //             </div>
        //         `;
        //     });
        // })
    });
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
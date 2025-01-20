# scribbledown
a lightweight Markdown-powered blogging engine thingy

Built over two days as a fun side project, it’s not overly complicated under the hood but gets the job done! i won't lie i had a lot of fun building this
it's pretty modular id say, the frontend is kinda just the index.html, index.css and app.js files, you can replace those for your own files as long as the html file will have the template strings


## How does this work?

You write your blog's pages in markdown files, on start scribbledown goes over the files directory and builds them into html files.
The template's html, js and css gets merged together with your markdown to create the blog's pages, to not rebuild the pages if nothing's changed.
scribbledown keeps track of every file in the files/ directory, the page template files and the config, so if either the markdown, template or config gets changed a rebuild will be triggered.


## Why build this?
Im going to be honest with you, i have no idea. this was originally meant to be a quick side project i could use to learn more about ci/cd and i kinda got side tracked :P

## Okay how do i use this thing?

Well for starters you need docker installed on your system as well as git, then it's just as easy as pulling the code, building the image and running it!

```sh
# Clone the git repo
git clone git@github.com:duch3201/scribbledown.git

# Build the Docker image
sudo docker build -t scribbledown .

# create the blog.conf file (if you skip this docker will create a directory with the same name)
touch $(pwd)/scribbledown/blog.conf

# Run the Docker container
sudo docker run -d -p 3001:3001 \
  -v $(pwd)/scribbledown/templates:/app/templates \
  -v $(pwd)/scribbledown/files:/app/files \
  -v $(pwd)/scribbledown/images:/app/images \
  -v $(pwd)/scribbledown/blog.conf:/app/blog.conf \
  --name scribbledown scribbledown

```

As for changing something like the page's template it's also quite simple, the template uses three files
1. index.html
2. index.css
3. app.js

The most important one being index.html, it contains these template strings:
| template string | Description                            |
|-----------------|----------------------------------------|
| {BLOGNAMETITLE} | Title of the blog in the browser tab.  |
| {PAGETITLE}     | Title of the current page.             |
| {PAGES}         | List of other pages on the blog.       |
| {PAGECONTENT}   | Content of the markdown page.          |
| {FOOTERCONTENT} | Footer HTML defined in the `blog.conf` |


the first two ones are used in the page's title (the one in the browser tab)
{PAGES} is the list of your other pages on the blog
rest of them are pretty selfexplanatory

there's also blog.conf, it looks like this:
```json
{
    "blogname":"scribbledown blog",
    "footerContent":"<p>© {year}</p> <a href='https://github.com/duch3201'>shadowman</a>",
    "dev":"false"
}

```

in here you define your blog's name, and the footer content.
devmode will tell scribble down to dynamically build and send out the pages, instead of using the built at start up ones

### What about images?
any image that's added to the `images/` directory will be accesible via the `/images/{filename}` endpoint

## How do i contribute?

well if you have an idea just build it and submit a pr, i'll be happy to look at it and merge it
if you ran into any problems just submit an issue, i'll try my best to help you!

btw if you create a template and you'd like to show it off, create an issue and i'll gladly put a link to it in this readme!

## attribution

to built scribbledown i used these libraries
* compression
* express
* cssnano
* terser
* postcss

and i used this theme for code highlighting:
https://draculatheme.com/highlightjs
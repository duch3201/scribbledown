# scribbledown plugins


in your plugin you can use these hooks to interact with the page contents
| Hooks          | Description                                                                   |
|----------------|-------------------------------------------------------------------------------|
| beforeBuild    | Code will be run before the build process starts                              |
| afterBuild     | Code will be run after the build process starts                               |
| beforeParse    | Code will be run before the markdown parsing starts                           |
| afterParse     | Code will be run after the markdown parsing                                   |
| beforeTemplate | This code will run before the parsed markdown gets inserted into the template |
| afterTemplate  | Code will run after the parsed markdown gets inserted into the template       |



TODO: Your plugin can also trigger a rebuild using the 


## interacting with your plugin from the frontend



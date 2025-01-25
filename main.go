package main

import (
	"encoding/json"
	"fmt"
	"regexp"
	"io"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
)

type Config struct {
	BlogName string `json:"blogName"`
	FooterContent string `json:"footerContent"`
	Dev bool `json:"dev"`
	CurrentTheme string `json:"currentTheme"`
}

type Frontmatter struct {
	Title string `json:"title"`
	Date string `json:"date"`
	Author string `json:"author"`
	ReadingTime int `json:"readingTime"`
}

// init() | TODO
// so we need to use a default config if we couldn't read the blog.conf file
// create it if it does not exist
// verify if the template directory exists, and if any themes are installed
// implement the checksums.json file
// re implement plguins, possibly staying with js

var blogConfig Config

func init() {
	fmt.Println("scribbledown init!")

	fmt.Println("Reading blog.conf")
	// Read the config file
	file, err := os.Open("blog.conf")
	if err != nil {
		fmt.Println("Error reading blog.conf")	
	}

	byteValue, _ := io.ReadAll(file)

	json.Unmarshal(byteValue, &blogConfig)

	// fmt.Println("Blog Name: ", blogConfig.BlogName)
	// fmt.Println("Footer Content: ", blogConfig.FooterContent)
	// fmt.Println("Dev: ", blogConfig.Dev)
	// fmt.Println("Current Theme: ", blogConfig.CurrentTheme)

}

func processLinks(linksArray map[string][]string) {
	fmt.Println(linksArray)
	files, err := os.ReadDir("./files")
	if err != nil {
		fmt.Println(err)
	}

	for _, file := range files {
		// fmt.Println(file.Name(), file.IsDir())
		if !file.IsDir() {
			// fmt.Println(file.Info())
			linksArray["/"] = append(linksArray["/"], file.Name())
		} else {
			// linksArray["/"] = append(linksArray["/"], file.Name())
			// fmt.Println(file.Name())
			files2, err := os.ReadDir("./files/"+file.Name())
			if err != nil {
				fmt.Println(err)
			}

			for _, file2 := range files2 {
				linksArray["/"+file.Name()] = append(linksArray["/"+file.Name()], file2.Name())
				// fmt.Println(file2.Name())
			}
		}

	}

	fmt.Println(linksArray)
}

func yeettotemplate(template string, content string, frontmatter Frontmatter) string {

	cssFile, err := os.Open("./template/"+blogConfig.CurrentTheme+"/"+"index.css")
	if err != nil {
		fmt.Println(err)
		return ""
	}

	cssBytes, err := io.ReadAll(cssFile)
	if err != nil {
		fmt.Println(err)
		return ""
	}

	css := string(cssBytes)

	jsFile, err := os.Open("./template/"+blogConfig.CurrentTheme+"/"+"app.js")
	if err != nil {
		fmt.Println(err)
		return ""
	}

	jsBytes, err := io.ReadAll(jsFile)
	if err != nil {
		fmt.Println(err)
		return ""
	}

	js := string(jsBytes)

	var linksMap map[string][]string = map[string][]string{
		"/": {},
	}

	processLinks(linksMap)

	template = strings.ReplaceAll(template, "</body>", "<script>"+js+"</script></body>")
	template = strings.ReplaceAll(template, "</head>", "</head><style>"+css+"</style></head>")
	template = strings.ReplaceAll(template, "{BLOGNAME}", blogConfig.BlogName)
	template = strings.ReplaceAll(template, "{PAGETITLE}", frontmatter.Title)
	template = strings.ReplaceAll(template, "{{date}}", frontmatter.Date)
	template = strings.ReplaceAll(template, "{{author}}", frontmatter.Author)
	template = strings.ReplaceAll(template, "{PAGECONTENT}", content)
	template = strings.ReplaceAll(template, "{FOOTERCONTENT}", blogConfig.FooterContent)

	// fmt.Println(template)

	return template

}

func CalculateReadingTime(html string) int {
	// Average reading speed is about 200-250 words per minute
	// This is a simple implementation
	words := len(strings.Fields(html))
	return words / 225
}

func parseMarkdown(markdown string) (string, Frontmatter) {
	if markdown == "" {
		panic("Input must be a string")
	}

	html := markdown
	frontmatter := Frontmatter{}

	// Frontmatter parsing
	frontmatterRegex := regexp.MustCompile(`(?s)^---\n(.*?)\n---`)
	frontmatterMatch := frontmatterRegex.FindStringSubmatch(html)
	if len(frontmatterMatch) > 1 {
		frontmatterContent := frontmatterMatch[1]
		for _, line := range strings.Split(frontmatterContent, "\n") {
			parts := strings.SplitN(line, ":", 2)
			if len(parts) == 2 {
				key := strings.TrimSpace(parts[0])
				value := strings.TrimSpace(parts[1])
				switch key {
				case "title":
					frontmatter.Title = value
				case "date":
					frontmatter.Date = value
				case "author":
					frontmatter.Author = value
				}
			}
		}
		html = strings.TrimSpace(html[len(frontmatterMatch[0]):])
	}

	// Code block and inline code protection
	codeBlocks := make(map[string]string)
	codeBlockCounter := 0

	// Protect fenced code blocks
	codeBlockRegex := regexp.MustCompile("(?s)```([^\\n]*)\n(.*?)```")
	html = codeBlockRegex.ReplaceAllStringFunc(html, func(match string) string {
		token := fmt.Sprintf("%%CODEBLOCK%d%%", codeBlockCounter)
		codeBlocks[token] = match
		codeBlockCounter++
		return token
	})

	// Protect inline code
	inlineCodeRegex := regexp.MustCompile("`([^`]+)`")
	html = inlineCodeRegex.ReplaceAllStringFunc(html, func(match string) string {
		token := fmt.Sprintf("%%INLINECODE%d%%", codeBlockCounter)
		codeBlocks[token] = match
		codeBlockCounter++
		return token
	})

	// Convert headers (h1-h6)
	for i := 6; i >= 1; i-- {
		pattern := regexp.MustCompile(fmt.Sprintf(`(?m)^%s\s+(.+)$`, strings.Repeat("#", i)))
		html = pattern.ReplaceAllString(html, fmt.Sprintf("<h%d>$1</h%d>", i, i))
	}

	// Convert other Markdown elements
	// Bold elements: ** or __
	html = regexp.MustCompile(`\*\*(.*?)\*\*|__(.*?)__`).ReplaceAllStringFunc(html, func(match string) string {
		content := regexp.MustCompile(`\*\*|__`).ReplaceAllString(match, "")
		return fmt.Sprintf("<strong>%s</strong>", content)
	})

	// Italic elements: * or _
	html = regexp.MustCompile(`\*(.*?)\*|_(.*?)_`).ReplaceAllStringFunc(html, func(match string) string {
		content := regexp.MustCompile(`\*|_`).ReplaceAllString(match, "")
		return fmt.Sprintf("<em>%s</em>", content)
	})

	// Strikethrough
	html = regexp.MustCompile(`~~(.*?)~~`).ReplaceAllString(html, "<del>$1</del>")

	// Images
	html = regexp.MustCompile(`!\[([^\]]*)\]\(([^)]+)\)`).ReplaceAllString(html, `<img src="$2" alt="$1">`)

	// Links with optional title
	linkRegex := regexp.MustCompile(`\[([^\]]+)\]\(([^)"]+)(?:\s+"([^"]+)")?\)`)
	html = linkRegex.ReplaceAllStringFunc(html, func(match string) string {
		parts := linkRegex.FindStringSubmatch(match)
		if len(parts) >= 3 {
			if len(parts) == 4 {
				return fmt.Sprintf(`<a href="%s" title="%s">%s</a>`, parts[2], parts[3], parts[1])
			}
			return fmt.Sprintf(`<a href="%s">%s</a>`, parts[2], parts[1])
		}
		return match
	})

	// Convert lists
	html = regexp.MustCompile(`(?m)^[\*\-\+]\s+(.+)`).ReplaceAllString(html, "<li>$1</li>")
	html = regexp.MustCompile(`(?m)^\d+\.\s+(.+)`).ReplaceAllString(html, "<li>$1</li>")
	html = regexp.MustCompile(`((?:<li>.*</li>\n?)+)`).ReplaceAllString(html, "<ul>$1</ul>")

	// Convert blockquotes and horizontal rules
	html = regexp.MustCompile(`(?m)^>\s*(.*$)`).ReplaceAllString(html, "<blockquote>$1</blockquote>")
	html = regexp.MustCompile(`(?m)^(?:[\t ]*(?:-{3,}|\*{3,}|_{3,})[\t ]*?)$`).ReplaceAllString(html, "<hr>")

	// Handle paragraphs
	paragraphs := strings.Split(html, "\n\n")
	for i, block := range paragraphs {
		block = strings.TrimSpace(block)
		if block == "" || strings.HasPrefix(block, "%%CODE") || (strings.HasPrefix(block, "<") && strings.HasSuffix(block, ">")) {
			continue
		}
		paragraphs[i] = fmt.Sprintf("<p>%s</p>", strings.ReplaceAll(block, "\n", "<br>"))
	}
	html = strings.Join(paragraphs, "\n\n")

	// Restore code blocks
	for token, replacement := range codeBlocks {
		if strings.HasPrefix(token, "%%INLINECODE") {
			html = strings.ReplaceAll(html, token, fmt.Sprintf("<code class=\"inline\">%s</code>", 
				strings.Trim(replacement, "`")))
		} else if strings.HasPrefix(token, "%%CODEBLOCK") {
			codeMatch := regexp.MustCompile("```([^\\n]*)\n(.*?)```").FindStringSubmatch(replacement)
			if len(codeMatch) > 2 {
				lang := strings.TrimSpace(codeMatch[1])
				if lang == "" {
					lang = "plaintext"
				}
				code := strings.TrimSpace(codeMatch[2])
				html = strings.ReplaceAll(html, token, 
					fmt.Sprintf("<pre><code class=\"language-%s\">%s</code></pre>", lang, code))
			}
		}
	}

	// Calculate reading time
	frontmatter.ReadingTime = CalculateReadingTime(html)

	return strings.TrimSpace(html), frontmatter
}

func main() {
	fmt.Println("lol")
	r := gin.Default()
	r.GET("/ping", func(c *gin.Context) {
		c.JSON(200, gin.H{"message": "pong"})
	})
	r.GET("/", func(c *gin.Context) {
        var templateFile, err = os.Open("./template/"+blogConfig.CurrentTheme+"/"+"index.html")
        if err != nil {
            fmt.Println(err)
            return
        }
        defer templateFile.Close()

        templateBytes, err := io.ReadAll(templateFile)
        if err != nil {
            fmt.Println(err)
            return
        }
        template := string(templateBytes)
        // fmt.Println(template)

		var contentFile, err2 = os.Open("./files/index.md")
		if err2 != nil {
			fmt.Println(err2)
			return
		}

		contentBytes, err := io.ReadAll(contentFile)
		if err != nil {
			fmt.Println(err)
			return
		}

		content := string(contentBytes)

		html, frontmatter := parseMarkdown(content)

		fmt.Println(html, `\n`, frontmatter)

		template = yeettotemplate(template, html, frontmatter)

		c.Writer.WriteString(template)
    })
	r.Run(":3000")
}
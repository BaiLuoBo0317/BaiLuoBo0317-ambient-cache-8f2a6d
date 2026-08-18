class BaiLuoBoCatalog extends ComicSource {
    name = "BaiLuoBo0317 资料索引"

    key = "blb0317_catalog_8f2a6d"

    version = "1.0.0"

    minAppVersion = "1.4.0"

    url = "https://cdn.jsdelivr.net/gh/BaiLuoBo0317/BaiLuoBo0317-ambient-cache-8f2a6d@main/ambient-index.js"

    baseUrl = "https://ffppt.com"

    _searchSessions = {}

    get requestHeaders() {
        return {
            "User-Agent": "Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/122 Mobile Safari/537.36",
            "Referer": `${this.baseUrl}/`
        }
    }

    _absoluteUrl(url) {
        if (!url) return ""
        if (url.startsWith("//")) return `https:${url}`
        if (url.startsWith("/")) return `${this.baseUrl}${url}`
        if (url.startsWith("http://")) return `https://${url.substring(7)}`
        return url
    }

    async _getDocument(url) {
        const response = await Network.get(url, this.requestHeaders)
        if (response.status !== 200) {
            throw `飞翔漫画网请求失败：HTTP ${response.status}`
        }
        return new HtmlDocument(response.body)
    }

    _parseComicList(doc) {
        const comics = []
        const seen = {}

        for (const item of doc.querySelectorAll(".home-truyendecu")) {
            const link = item.querySelector("a[href*='/novel']")
            if (!link) continue

            const href = link.attributes["href"] || ""
            const match = href.match(/\/novel(\d+)\/?/)
            if (!match || seen[match[1]]) continue

            const titleElement = item.querySelector("h3[itemprop='name']")
            const image = item.querySelector("img[itemprop='image']") || item.querySelector("img")
            const latest = item.querySelector(".tt-status small")
            const title = (titleElement?.text || link.attributes["title"] || "").trim()
            if (!title) continue

            seen[match[1]] = true
            comics.push(new Comic({
                id: match[1],
                title,
                subtitle: latest?.text.trim() || "",
                cover: this._absoluteUrl(image?.attributes["src"] || "")
            }))
        }
        return comics
    }

    _parseCategoryMaxPage(doc) {
        let maxPage = 1
        for (const link of doc.querySelectorAll("ul.pagination a[href]")) {
            const href = link.attributes["href"] || ""
            const match = href.match(/index_(\d+)\.html/)
            if (match) maxPage = Math.max(maxPage, Number(match[1]))
        }
        return maxPage
    }

    _parseSearchSession(doc) {
        let searchId = null
        let maxPage = 1

        for (const link of doc.querySelectorAll("ul.pagination a[href*='searchid=']")) {
            const href = (link.attributes["href"] || "").replaceAll("&amp;", "&")
            const idMatch = href.match(/[?&]searchid=(\d+)/)
            const pageMatch = href.match(/[?&]page=(\d+)/)
            if (idMatch) searchId = idMatch[1]
            // 该站搜索结果的 page 参数从 0 开始。
            if (pageMatch) maxPage = Math.max(maxPage, Number(pageMatch[1]) + 1)
        }
        return { searchId, maxPage }
    }

    category = {
        title: "飞翔漫画网",
        parts: [
            {
                name: "频道",
                type: "fixed",
                categories: ["最近更新", "新作入库", "热门", "已完结", "国漫", "韩漫", "日漫", "欧美", "港台"],
                itemType: "category",
                categoryParams: ["latest", "release", "popular", "completed", "guoman", "hanman", "riman", "oumei", "gangtai"]
            }
        ],
        enableRankingPage: false
    }

    categoryComics = {
        load: async (category, param, options, page) => {
            const path = param || "latest"
            const suffix = page > 1 ? `/index_${page}.html` : "/"
            const doc = await this._getDocument(`${this.baseUrl}/${path}${suffix}`)
            const result = {
                comics: this._parseComicList(doc),
                maxPage: this._parseCategoryMaxPage(doc)
            }
            doc.dispose()
            return result
        },
        optionList: []
    }

    search = {
        load: async (keyword, options, page) => {
            const normalizedPage = Math.max(1, page || 1)
            let session = this._searchSessions[keyword]
            let doc

            if (normalizedPage === 1 || !session?.searchId) {
                const url = `${this.baseUrl}/e/search/index.php?keyboard=${encodeURIComponent(keyword)}` +
                    "&show=title%2Cwriter%2Cbyr&searchget=1"
                doc = await this._getDocument(url)
                session = this._parseSearchSession(doc)
                this._searchSessions[keyword] = session
            } else {
                const resultPage = normalizedPage - 1
                const url = `${this.baseUrl}/e/search/result/index.php?page=${resultPage}` +
                    `&searchid=${session.searchId}`
                doc = await this._getDocument(url)
            }

            const result = {
                comics: this._parseComicList(doc),
                maxPage: session?.maxPage || 1
            }
            doc.dispose()
            return result
        },
        optionList: [],
        enableTagsSuggestions: false
    }

    comic = {
        loadInfo: async (id) => {
            const url = `${this.baseUrl}/novel${id}/`
            const doc = await this._getDocument(url)

            const meta = (property) => {
                const element = doc.querySelector(`meta[property='${property}']`)
                return element?.attributes["content"]?.trim() || ""
            }

            const title = meta("og:novel:book_name") || doc.querySelector("h3.title")?.text.trim() || `漫画 ${id}`
            const cover = this._absoluteUrl(meta("og:image"))
            const author = meta("og:novel:author")
            const category = meta("og:novel:category")
            const status = meta("og:novel:status")
            const updateTime = meta("og:novel:update_time")
            const descriptionElement = doc.querySelector(".desc-text")
            const description = (descriptionElement?.text || "")
                .replace(/^\s*漫画介绍\s*/, "")
                .trim()

            const chapters = {}
            const chapterList = doc.querySelector("#list-chapter")
            if (chapterList) {
                for (const link of chapterList.querySelectorAll("a[href*='/chapter']")) {
                    const href = link.attributes["href"] || ""
                    const match = href.match(/chapter(\d+)\.html/)
                    if (!match) continue
                    chapters[match[1]] = (link.attributes["title"] || link.text || `第 ${match[1]} 章`).trim()
                }
            }

            const tags = {}
            if (author) tags["作者"] = [author]
            if (category) tags["分类"] = [category]
            if (status) tags["状态"] = [status]

            const details = {
                title,
                cover,
                description,
                tags,
                chapters,
                uploader: author || null,
                updateTime: updateTime || null,
                url
            }
            doc.dispose()
            return details
        },

        loadEp: async (comicId, epId) => {
            if (epId === null || epId === undefined) {
                throw "缺少章节编号"
            }

            const chapterUrl = `${this.baseUrl}/novel${comicId}/chapter${epId}.html`
            const doc = await this._getDocument(chapterUrl)
            const images = []

            for (const image of doc.querySelectorAll(".chapter-content img")) {
                const source = image.attributes["data-original"] ||
                    image.attributes["data-src"] ||
                    image.attributes["src"]
                if (source && !source.includes("/novel/images/")) {
                    images.push(this._absoluteUrl(source))
                }
            }
            doc.dispose()

            if (images.length === 0) {
                throw "本章没有解析到漫画图片，站点页面结构可能已变更"
            }
            return { images }
        },

        onImageLoad: (url, comicId, epId) => {
            return {
                url: this._absoluteUrl(url),
                headers: {
                    "User-Agent": this.requestHeaders["User-Agent"],
                    "Referer": `${this.baseUrl}/novel${comicId}/chapter${epId}.html`
                }
            }
        },

        onThumbnailLoad: (url) => {
            return {
                headers: this.requestHeaders
            }
        },

        enableTagsTranslate: false
    }
}

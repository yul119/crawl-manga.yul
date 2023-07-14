import {NETTRUYEN_URL} from "./constant.js";
import * as cheerio from 'cheerio'
import fetch from  'node-fetch'
import * as fs from "fs";
import * as path from "path"
import PDFDocument from "pdfkit"

const crawlDataService = {
     searchManga: async (req,res) => {
          const keyword = req.query?.keyword
          const searchUrlWithKeyword = `${NETTRUYEN_URL.SEARCH}${keyword.split(" ").join('+')}`

          const response = await fetch(searchUrlWithKeyword)
          const html = await response.text()

          const $ = cheerio.load(html)
          const listResultSearch = $('.row','.items').html().toString()
          const $$ = cheerio.load(listResultSearch)

          const titles = $$("a",".image").map((i, el) => el.attribs.title).get()
          const hrefs = $$("a",".image").map((i, el) => el.attribs.href).get()
          let images = $$("img","a").map((i, el) => el.attribs['data-original']).get()
          images = Array.from(new Set(images))

          const data = titles.map((el, i) =>{return  {title: el, href: hrefs[i], image: images[i]}})

          res.send(data)
     },

     countChapter: async (req,res) => {
          const url = req.body?.url

          const response = await fetch(url)
          const html = await response.text()

          const $ = cheerio.load(html)
          const listChapter = $('nav','.list-chapter').children().toString()
          const $$ = cheerio.load(listChapter)
          const chapters = $$(".chapter","li").map((i,el) => el.attribs.class).get()

          res.send({count: chapters.length})
     },

     getChapter: async (req,res) => {
          const url = req.body?.url
          const from = Number(req.query?.from)
          const to = Number(req.query?.to)

          const response = await fetch(url)
          const html = await response.text()

          const $ = cheerio.load(html)
          const listChapter = $('nav','.list-chapter').children().toString()
          const $$ = cheerio.load(listChapter)
          const chapters = $$("a","li")
              .map((i, el) => el.attribs.href)
              .get()
              .reverse()
              .filter((el, i) => i+1 >= from && i+1 <=to)

          Promise.allSettled([
               chapters.forEach(async (chapter) => {
                    await crawlDataService.crawlChapter(chapter)
               })
          ])

          res.send(chapters)
     },

     crawlChapter: async (url) => {
          const response = await fetch(url)
          const html = await response.text()

          const $ = cheerio.load(html)
          const pagesChapterUrl = $("img",".page-chapter")
              .map((i,el) => el.attribs.src)
              .get()
              .map((el, i) => `${NETTRUYEN_URL.PAGE}/${el.split('/').slice(-3).join("/")}`)

          crawlDataService.saveImages(pagesChapterUrl)
     },

     saveImages: (pageChapterUrl ) => {
          if (fs.existsSync("images")) {
               const directory = "images"
               fs.readdir(directory, (err, files) => {
                    if (err) throw err;
                    for (const file of files) {
                         fs.unlink(path.join(directory, file), (err) => {
                              if (err) throw err;
                         });
                    }
               });

          } else {
               fs.mkdir("images", (err) => {
                    if (err) throw err;
               })
          }

          pageChapterUrl.forEach((pageChapter) => {
               fetch(pageChapter, {
                    headers: {"referer": `${NETTRUYEN_URL.REFERER}`}
               }).then((response) => {
                    const dest = fs.createWriteStream(`images/${pageChapter.split("/").slice(-3).join("__")}`);
                    response.body.pipe(dest);
               })
          });
     },

     savePDF: (req,res) => {
          const doc = new PDFDocument()
          doc.pipe(fs.createWriteStream(`${req.query?.name}.pdf`));

          const directory = 'images'
          const files = fs.readdirSync(directory).sort((a,b) => a.localeCompare(b, undefined, {
               numeric: true,
               sensitivity: 'base'
          }))

          doc.text('"Today a reader, tomorrow a leader." – Margaret Fuller', {
                   width: 410,
                   align: 'center'
              }
          );


          for (let i =1; i < files.length; i++) {
               try {
                    const images = fs.readFileSync(`${directory}/${files[i]}`)
                    if(images){
                         doc.addPage()
                             .image(`${directory}/${files[i]}`, {
                                  fit: [500, 680],
                                  align: 'center',
                                  valign: 'center'
                             });
                    }
               } catch (err) {
                    console.error(err)
               }
          }

          doc.end()

          res.send('Done.')
     },

     getPDF: async (req,res) => {
          res.download(`${req.query?.name}.pdf`)
     }
}

export  default  crawlDataService
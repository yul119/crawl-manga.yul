import express from  'express'
import crawlDataService from './crawl-data.service.js'

const app = express()
app.use(express.json())

app.get('/search', (req,res) => {
    crawlDataService.searchManga(req, res)
})
app.get('/count', (req,res) => {
    crawlDataService.countChapter(req, res)
})
app.get('/chapter', (req,res) => {
    crawlDataService.getChapter(req, res)
})
app.get('/save-pdf', (req,res) => {
    crawlDataService.savePDF(req,res)
})
app.get('/pdf', (req,res) => {
    crawlDataService.getPDF(req, res)
})

const PORT = 3000
app.listen(PORT, ()=>console.log(`Server started on port ${PORT}`))
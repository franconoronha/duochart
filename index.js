const express = require('express')
const axios = require('axios')
const app = express()

const cookieParser = require('cookie-parser')
const session = require('express-session')
const flash = require('express-flash')


require('dotenv/config')

app.use(flash())
app.use(cookieParser('franco'))
app.use(session({
    secret: 'franco',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 60000 }
}))

app.use(express.urlencoded({extended: true}))
app.use(express.json())
app.use(express.static('public'))

app.set('view engine', 'ejs')

const key = process.env.API_KEY
const base_url = "http://ws.audioscrobbler.com/2.0/?"

const headers = {
    'user-agent': 'Duochart (franconoronha11@gmail.com)'
}

app.get('/', (req, res) => {
    let error = req.flash('error')
    let user = req.flash('user')

    if(!error.length) {
        error = null 
        user = null
    }

    res.render('index', {error, user})
})

app.post('/result', (req, res) => {
    let user = req.body.user
    let user_2 = req.body.user_2

    let payload = {
        api_key: key,
        method: 'user.getTopAlbums',
        format: 'json',
        limit: 100,
        user: user
    }
    let query = new URLSearchParams(payload)

    // Poderia usar async/await pra tratar melhor os erros
    axios.get(base_url + query, {headers: headers}).then(res1 => {
        payload.user = user_2
        query = new URLSearchParams(payload)

        axios.get(base_url + query, {headers: headers}).then(res2 => {
            let images = []
            let overlap = []
            
            let user_one_items = res1.data
            let user_two_items =  res2.data

            let items = user_one_items.topalbums.album
            let items_2 = user_two_items.topalbums.album 

            let user = user_one_items.topalbums['@attr'].user 
            let user_2 = user_two_items.topalbums['@attr'].user

            for(item of items) {
                for(item2 of items_2) {
                    if(item.name == item2.name) {
                        overlap.push({
                            name: item.name,
                            u1_playcount: item.playcount,
                            u2_playcount: item2.playcount,
                            factor: Math.min(item.playcount, item2.playcount)
                        })

                        images.push(item.image[2]['#text']) // 0=small 1=medium 2=large)
                    }
                }
            }
            overlap.sort((a, b) => (a.factor < b.factor ? 1 : -1 ))
            console.log(`${user} x ${user_2}`)
            res.render('result', {
                items,
                items_2,
                overlap,
                images,
                user,
                user_2,
            })
        }).catch(err => {
            req.flash('user', user_2)
            req.flash('error', err.response.data.message)
            res.redirect('/')
        })
    }).catch(err => {
        req.flash('user', user)
        req.flash('error', err.response.data.message)
        res.redirect('/')
    })
})

app.listen(process.env.PORT || 3000, ()=> { console.log('OK') })
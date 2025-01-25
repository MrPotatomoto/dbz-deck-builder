function getImgUrl(card) {
    let name = ''
    if (card.type === 'Personality' || card.type === 'Ally') { 
        name = card.name + ' - ' + card.title 
    } else {
        name = card.name 
    }

    let cardImgUrl = ''

    if (card.type === 'Personality' || card.type === 'Ally') { 
        cardImgUrl = card.name + '-' + card.title 
    } else {
        cardImgUrl = card.name 
    }
    if (card.card_number.includes('P')) {
        cardImgUrl = cardImgUrl + '-promo'
    }
    if (card.name === 'Cell' && card.type !== 'Ally') {
        cardImgUrl += '-' + card.card_number
    }
    if (card.set === 'Legends' || card.set === 'Celestial Tournament') {
        cardImgUrl += '.png'
    } else {
        cardImgUrl += '.jpg'
    }


    return { url:'/img/cards/' + card.set.split(' ').join('-').toL + '/' + cardImgUrl.split(' ').join('-'), name }
}

module.exports = { getImgUrl }
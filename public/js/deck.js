// Utility functions
const debounce = (func, wait) => {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
};

const sanitizeInput = input => input.replace(/[^a-zA-Z0-9\s:'"-]/g, '');

const fetchCards = async (searchParams) => {
    try {
        const response = await fetch(`/api/cards?${searchParams.toString()}`);
        return await response.json();
    } catch (error) {
        console.error('Error fetching card suggestions:', error);
        return [];
    }
};

// Show suggestions
const showSuggestions = async (query) => {
    const suggestionsList = document.getElementById('suggestions');
    suggestionsList.classList.add('w-auto', 'shadow');
    suggestionsList.innerHTML = ''; // Clear previous suggestions

    query = sanitizeInput(query);
    if (query.length === 0) return;

    const searchParams = new URLSearchParams();
    const regex = /(\w+):(["']?)([^\s"']+|(?:[^"']+?))\2/g;
    let match;
    let remainingQuery = query;

    while ((match = regex.exec(query)) !== null) {
        const field = match[1];
        const value = match[3];
        searchParams.append(field, value);
        remainingQuery = remainingQuery.replace(match[0], '').trim();
    }

    if (remainingQuery) {
        searchParams.append('name_or_title', remainingQuery);
    }

    const cards = await fetchCards(searchParams);
    cards.forEach(card => {
        const displayName = card.title ? `${card.name} - ${card.title}` : card.name;
        const suggestionItem = document.createElement('li');
        suggestionItem.style.userSelect = 'none';
        suggestionItem.classList.add('list-group-item', 'list-group-item-action', 'd-flex', 'justify-content-between', 'align-items-center');
        suggestionItem.innerHTML = `<div class="mr-5">${card.card_level > 0 ? 'LV ' + card.card_level : '' } ${displayName}</div><div class="text-muted">${card.type} - ${card.set}</div>`;
        suggestionItem.onclick = () => {
            addCard(card._id, displayName, card.type || 'Unknown');
            suggestionsList.innerHTML = ''; // Clear suggestions
            removeImgFromViewer();
        };
        suggestionItem.onmouseenter = () => addImgToViewer(card.img_url);
        suggestionItem.onmouseleave = () => removeImgFromViewer();
        suggestionsList.appendChild(suggestionItem);
    });

    document.addEventListener('click', function clearSuggestionsOnClickOutside(event) {
        if (!suggestionsList.contains(event.target)) {
            suggestionsList.innerHTML = ''; // Clear suggestions
            document.removeEventListener('click', clearSuggestionsOnClickOutside); // Remove the event listener
        }
    });
};

// Debounced version of showSuggestions
const debouncedShowSuggestions = debounce(showSuggestions, 300);

// Attach the debounced function to your search input
document.getElementById('searchQuery').addEventListener('input', event => {
    debouncedShowSuggestions(event.target.value);
});

// Function to check for Enter key press
const checkEnter = (event) => {
    if (event.key === 'Enter') {
        event.preventDefault();
        saveDeck();
        event.target.blur();
    }
};

// Function to add image to viewer
const addImgToViewer = (imgUrl) => { 
    const viewer = document.getElementById('viewer');
    viewer.innerHTML = '';

    const img = document.createElement('img');
    img.classList.add('img-fluid', 'border', 'shadow-sm');
    img.src = imgUrl;
    viewer.appendChild(img);

    // console.log('Image URL:', imgUrl);

    viewer.style.display = 'block';
};

// Function to remove image from viewer
const removeImgFromViewer = () => {
    const viewer = document.getElementById('viewer');
    viewer.innerHTML = '';
    viewer.style.display = 'none';
};

// Function to add card to the deck
const addCard = (cardId, cardName, cardType) => {
    const encodedType = encodeURIComponent(cardType);
    let typeSection = document.getElementById(`type-${encodedType}`);
    if (!typeSection) {
        createTypeSection(cardType);
        typeSection = document.getElementById(`type-${encodedType}`);
    }

    const selectedCardsList = typeSection.querySelector('.list-group');
    const existingCardInput = selectedCardsList.querySelector(`input[name="cards"][value="${cardId}"]`);

    const card = {};

    fetch(`/api/cards?search=${encodeURIComponent(cardId)}`)
        .then(response => response.json())
        .then(cards => {
            card.img_url = cards[0].img_url;
        })
        .catch(error => {
            console.error('Error fetching card image:', error);
        });

    if (existingCardInput) {
        let quantity = parseInt(existingCardInput.getAttribute('data-quantity'), 10);
        quantity += 1;
        existingCardInput.setAttribute('data-quantity', quantity);
        const displayNameElement = existingCardInput.closest('li').querySelector('span');
        displayNameElement.textContent = `${quantity}`;
    } else {
        const cardItem = document.createElement('li');
        cardItem.classList.add('list-group-item', 'd-flex', 'justify-content-between', 'align-items-center');
        cardItem.onmouseenter = () => addImgToViewer(card.img_url);
        cardItem.onmouseleave = () => removeImgFromViewer();
        cardItem.innerHTML = `
            <div class="flex-grow-1">
                <span class="mr-3" id="quantity-${cardId}">1</span>
                <span>${cardName}</span>
            </div>
            <div class="d-flex align-items-center">
                <div class="btn-group ml-2">
                    <a class="text-dark dropdown-toggle" href="#" role="button" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false"></a>
                    <div class="dropdown-menu dropdown-menu-right z-index-3">
                        <button class="dropdown-item" onclick="increaseQuantity('${cardId}', this)" aria-label="Increase Quantity">Add One</button>
                        <button class="dropdown-item" onclick="decreaseQuantity('${cardId}', this)" aria-label="Decrease Quantity">Remove One</button>
                        <button class="dropdown-item text-danger" onclick="removeCard('${cardId}', this)" aria-label="Remove Card">Remove All</button>
                    </div>
                </div>
            </div>
            <input type="hidden" name="cards" value="${cardId}" data-quantity="1">
        `;
        selectedCardsList.appendChild(cardItem);
    }
    document.getElementById('searchQuery').value = '';  // Clear search input
    document.getElementById('viewer').style.display = 'none';  // Hide image viewer
    saveDeck();  // Automatically save the deck
};

// Function to create a new type section
const createTypeSection = (cardType) => {
    const cardContainer = document.querySelector('.card-container');
    const encodedType = encodeURIComponent(cardType);
    const typeSection = document.createElement('div');
    typeSection.classList.add('mb-3');
    typeSection.id = `type-${encodedType}`;
    typeSection.innerHTML = `
        <h5>${cardType}</h5>
        <ul class="list-group mb-3"></ul>
    `;
    cardContainer.appendChild(typeSection);
};

// Function to increase card quantity
const increaseQuantity = (cardId, buttonElement) => {
    const inputElement = buttonElement.closest('li').querySelector(`input[name="cards"][value="${cardId}"]`);
    let quantity = parseInt(inputElement.getAttribute('data-quantity'), 10);
    quantity += 1;
    inputElement.setAttribute('data-quantity', quantity);
    const quantityElement = buttonElement.closest('li').querySelector(`#quantity-${cardId}`);
    quantityElement.textContent = quantity;
    saveDeck();  // Automatically save the deck
};

// Function to decrease card quantity
const decreaseQuantity = (cardId, buttonElement) => {
    const inputElement = buttonElement.closest('li').querySelector(`input[name="cards"][value="${cardId}"]`);
    let quantity = parseInt(inputElement.getAttribute('data-quantity'), 10);
    if (quantity > 1) {
        quantity -= 1;
        inputElement.setAttribute('data-quantity', quantity);
        const quantityElement = buttonElement.closest('li').querySelector(`#quantity-${cardId}`);
        quantityElement.textContent = quantity;
        saveDeck();  // Automatically save the deck
    } else {
        removeCard(cardId, buttonElement);
    }
};

// Function to remove card from the deck
const removeCard = (cardId, buttonElement) => {
    const cardItem = buttonElement.closest('li');
    const parent = cardItem.parentNode;
    parent.removeChild(cardItem);
    saveDeck();  // Automatically save the deck

    if (parent.children.length === 0) {
        parent.parentNode.parentNode.removeChild(parent.parentNode);
    }

    removeImgFromViewer();
    document.getElementById('viewer').style.display = 'none';  // Hide image viewer
};

// Function to save the deck
const saveDeck = () => {
    const cardInputs = document.querySelectorAll('input[name="cards"]');
    const cards = Array.from(cardInputs).map(input => ({
        _id: input.value,
        quantity: parseInt(input.getAttribute('data-quantity'), 10)
    }));

    const deckName = document.getElementById('deckName').textContent;
    const deckDescription = document.getElementById('deckDescription').textContent;

    const deckData = { 
        name: deckName,
        description: deckDescription,
        cards: cards 
    };

    fetch(window.location.pathname, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(deckData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            console.log('Deck saved successfully');
        } else {
            console.error('Failed to save deck:', data.message);
        }
    })
    .catch(error => {
        console.error('Error saving deck:', error);
    });
};

// Function to delete the deck
const deleteDeck = () => {
    if (confirm('Are you sure you want to delete this deck? This action cannot be undone.')) {
        fetch(window.location.pathname, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                window.location.href = '/decks';
            } else {
                alert('Failed to delete deck: ' + data.message);
            }
        })
        .catch(error => {
            console.error('Error deleting deck:', error);
            alert('Failed to delete deck: ' + error.message);
        });
    }
};

// Event listener for mouse movement to position the viewer
document.addEventListener('DOMContentLoaded', () => {
    const viewer = document.getElementById('viewer');
  
    document.addEventListener('mousemove', event => {
      const { clientX: x, clientY: y } = event;
      const { offsetWidth: viewerWidth, offsetHeight: viewerHeight } = viewer;
      const { innerWidth: viewportWidth, innerHeight: viewportHeight } = window;
  
      let left = x + 20;
      let top = y + 20;
  
      if (x > viewportWidth / 2) {
        left = x - viewerWidth - 20;
        if (left < 0) left = 0;
      } else {
        if (left + viewerWidth > viewportWidth) left = viewportWidth - viewerWidth - 20;
      }
  
      if (y > viewportHeight / 2) {
        top = y - viewerHeight - 20;
        if (top < 0) top = 0;
      } else {
        if (top + viewerHeight > viewportHeight) top = viewportHeight - viewerHeight - 20;
      }
  
      viewer.style.left = `${left}px`;
      viewer.style.top = `${top}px`;
      viewer.style.display = 'block';
      viewer.style.position = 'fixed';
    });
  
    document.addEventListener('mouseleave', () => {
      viewer.style.display = 'none';
    });
});
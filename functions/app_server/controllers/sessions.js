var firebase = require('../firebase_config')
var walmartCtrl = require("../controllers/walmart")

/*************************************************************************/
module.exports.newSession = function(req, res) {
    //if '/' then req.params.in the index
    //if '?' then req.query.userspcific
    //if 'patch' or 'post' request then you might have to use rec.body.
    var difficulty = req.body.difficulty;
    firebase.db.collection("sessions").add({
        difficulty: difficulty,
        cartItemsName: [],
        cartItemsQty: [],
        cartItemsPrice: [],
        suggestedBudget: null,
    })
    .then(function(responseFromFirebase) {
        res.send(responseFromFirebase.id);
    })
    .catch(function(error) {
    });
}

/*************************************************************************/

module.exports.updateSession = function(req, res) {

    let sessionID = req.params.sessionID;
    let commandCode = req.params.commandCode;
    let categoryNode = req.body.categoryNode;
    let itemName = req.body.itemName;
    let itemQty = req.body.itemQty;
    let upcCode= req.body.upcCode;
    
    let difficulty = '';
    let suggestedBudget = 0.00;
    let cartItemsName = [];
    let cartItemsQty = [];
    let cartItemsPrice = [];

    firebase.db.collection('sessions').doc(sessionID).get().then(doc => {
        difficulty = doc.data().difficulty;
        suggestedBudget = doc.data().suggestedBudget;
        cartItemsName = doc.data().cartItemsName;
        cartItemsQty = doc.data().cartItemsQty;
        cartItemsPrice = doc.data().cartItemsPrice;

        if(commandCode === 'add') {
            if_add(difficulty, suggestedBudget, itemName, itemQty, categoryNode).then(response => {
                
                var foundItem = false;
                var indexOfFoundItem = 0;

                for(var i in cartItemsName) {
                    if(cartItemsName[i] === itemName) {
                        foundItem = true;
                        indexOfFoundItem = i;
                    }
                }

                if(foundItem) {
                    cartItemsQty[indexOfFoundItem] += parseInt(itemQty);
                    cartItemsPrice[indexOfFoundItem] += (response.calculatedBudget);
                }
                else {
                    cartItemsName.push(itemName);
                    cartItemsQty.push(parseInt(itemQty));
                    cartItemsPrice.push(response.calculatedBudget);
                }
                
                firebase.db.collection("sessions").doc(sessionID).update({
                    suggestedBudget: response.suggestedBudget,
                    cartItemsName: cartItemsName,
                    cartItemsQty: cartItemsQty,
                    cartItemsPrice: cartItemsPrice
                })
                .then(function() {
                })
                .catch(function(error) {
                });
                
                res.json(response);
            });
        } else if(commandCode === 'delete') {
            var newItemArray = doc.data().cartItemsName;
            var newPriceList = doc.data().cartItemsPrice;
            var newQtyList = doc.data().cartItemsQty;
            var newSuggestBgt = doc.data().suggestedBudget;
            if_delete(sessionID,newItemArray, newPriceList ,newQtyList ,itemName, itemQty,newSuggestBgt).then((message) => {
                res.send(message);
            }).catch((error) => {
                res.send(error);
            });
        } else if(commandCode === 'check') {
            var newItemArray = doc.data().cartItemsName;
            var newPriceList = doc.data().cartItemsPrice;
            var newQtyList = doc.data().cartItemsQty;
            var newSuggestBgt = doc.data().suggestedBudget;
            if_check(sessionID, newItemArray, newPriceList ,newQtyList, itemName, itemQty, newSuggestBgt, upcCode).then(frontEndResponse => {
                res.json(frontEndResponse);
            });
        } 
    }).catch(error => {
        //error
    });
}

/*************************************************************************/

function if_add(difficulty, suggestedBudget, itemName, itemQty, categoryNode) {

    var ifAddResponse = {};

    if(difficulty === 'none') {
        // return the avergae of all items
        ifAddResponse = new Promise(function(resolve) {

            let listOfPrices = [0.00];
            let calculatedBudget = 0.00;
            let thumbnail = "";

            walmartCtrl.searchWithCategroy(itemName, categoryNode).then((walmartResponse) => {
                for(var i in walmartResponse['items']) {
                    let price = parseFloat(walmartResponse['items'][i]['salePrice'], 0);
                    listOfPrices.push(price);
                }
                
                if(walmartResponse['items'][0]['thumbnailImage']) {
                    thumbnail = walmartResponse['items'][0]['thumbnailImage'];
                }

                listOfPrices = listOfPrices.sort((a, b) => a - b);
                calculatedBudget = listOfPrices[Math.ceil(listOfPrices.length/6)];
                calculatedBudget *= itemQty;

                suggestedBudget = suggestedBudget+calculatedBudget;
                
                let map = {
                    suggestedBudget: suggestedBudget,
                    thumbnail: thumbnail,
                    categoryNode: categoryNode,
                    calculatedBudget: calculatedBudget
                };

                resolve(map);
            });
        });
    } else if(difficulty === 'both') {
        // return the cheapest of only branded items
        ifAddResponse = new Promise(function(resolve) {

            let listOfPrices = [];
            let calculatedBudget = 0.00;
            let thumbnail = "";

            walmartCtrl.searchWithCategroy(itemName, categoryNode).then((walmartResponse) => {    
                for(var i in walmartResponse['items']) {
                    if(walmartResponse['items'][i]['brandName'] !== 'Great Value') {
                        listOfPrices.push(walmartResponse['items'][i]['salePrice']);
                    }
                }

                listOfPrices = listOfPrices.filter((num) => {
                    return num != undefined && num != null;
                });
                
                if(walmartResponse['items'][0]['thumbnailImage']) {
                    thumbnail = walmartResponse['items'][0]['thumbnailImage']
                }
                calculatedBudget = Math.min(...listOfPrices);
                calculatedBudget *= itemQty;

                suggestedBudget = suggestedBudget+calculatedBudget;
                
                let map = {
                    suggestedBudget: suggestedBudget,
                    thumbnail: thumbnail,
                    calculatedBudget: calculatedBudget
                };

                resolve(map);
            });
        });
    } else if(difficulty === 'brand') {
        // return the average of all branded items only
        ifAddResponse = new Promise(function(resolve) {

            let listOfPrices = [];
            let calculatedBudget = 0.00;
            let thumbnail = "";

            walmartCtrl.searchWithCategroy(itemName, categoryNode).then((walmartResponse) => {
                for(var i in walmartResponse['items']) {
                    if(walmartResponse['items'][i]['brandName'] !== 'Great Value') {
                        listOfPrices.push(parseFloat(walmartResponse['items'][i]['salePrice']));
                        sumPrices += parseFloat(walmartResponse['items'][i]['salePrice']);
                    }
                }
                
                if(walmartResponse['items'][0]['thumbnailImage']) {
                    thumbnail = walmartResponse['items'][0]['thumbnailImage']
                }

                listOfPrices = listOfPrices.sort((a, b) => a - b);
                calculatedBudget = (listOfPrices[Math.ceil(listOfPrices.length/6)]);
                calculatedBudget *= itemQty;

                suggestedBudget = suggestedBudget+calculatedBudget;
                
                let map = {
                    suggestedBudget: suggestedBudget,
                    thumbnail: thumbnail,
                    calculatedBudget: calculatedBudget
                };

                resolve(map);
            });
        });
    } else if(difficulty === 'cost') {
        // return the cheapest of all items
        ifAddResponse = new Promise(function(resolve) {

            let listOfPrices = [];
            let calculatedBudget = 0.00;
            let thumbnail = "";

            walmartCtrl.searchWithCategroy(itemName, categoryNode).then((walmartResponse) => {
                for(var i in walmartResponse['items']) {
                    listOfPrices.push(walmartResponse['items'][i]['salePrice']);
                }

                listOfPrices = listOfPrices.filter((num) => {
                    return num != undefined && num != null;
                });
                
                if(walmartResponse['items'][0]['thumbnailImage']) {
                    thumbnail = walmartResponse['items'][0]['thumbnailImage']
                }
                calculatedBudget = Math.min(...listOfPrices);
                calculatedBudget *= itemQty;
                
                suggestedBudget = suggestedBudget+calculatedBudget;

                let map = {
                    suggestedBudget: suggestedBudget,
                    thumbnail: thumbnail,
                    calculatedBudget: calculatedBudget
                };

                resolve(map);
            });
        });
    }

    return ifAddResponse;
}

/*************************************************************************/

//if_delete(sessionID,newItemArray, newPriceList ,newQtyList ,itemName, itemQty,newSuggestBgt);
function if_delete(sessionID, newItemArray, newPriceList ,newQtyList, itemName, itemQty, newSuggestBgt) {

    for(var i = 0; i < newItemArray.length; ++i) {
        if(newItemArray[i]===itemName) {
            if(i != newItemArray.length -1) {
                if(newQtyList[i] - itemQty <= 0) {
                    newSuggestBgt -= (newPriceList[i]);
                    newItemArray.splice(i,1);
                    newPriceList.splice(i,1);
                    newQtyList.splice(i,1);
                } else {
                    newSuggestBgt -= (newPriceList[i]/newQtyList[i])* itemQty;
                    newPriceList[i] -= (newPriceList[i]/newQtyList[i])* itemQty;
                    newQtyList[i] -= itemQty;
                }
            } else {
                if(newQtyList[i] - itemQty <= 0) {
                    newSuggestBgt -= (newPriceList[i]);
                    newItemArray.pop();
                    newPriceList.pop();
                    newQtyList.pop();
                }
                else {
                    newSuggestBgt -= (newPriceList[i]/newQtyList[i])* itemQty;
                    newPriceList[i] -= (newPriceList[i]/newQtyList[i])* itemQty;
                    newQtyList[i] -= itemQty;
                }
            }
        }
    }

    return new Promise(function(resolve) {
        
        let message = "";

        firebase.db.collection("sessions").doc(sessionID).update({
            cartItemsName: newItemArray,
            suggestedBudget: newSuggestBgt,
            cartItemsPrice: newPriceList,
            cartItemsQty: newQtyList
            
        })
        .then(function() {
            message = 'Item(s) Deleted'
            resolve(message);
        })
        .catch(function(error) {
            message = 'Item(s) not deleted. Error: '
            reject(message, error);
        });
    });
}

/*************************************************************************/

function if_check(sessionID, newItemArray, newPriceList ,newQtyList, itemName, itemQty, newSuggestBgt, upcCode) {
    
    return new Promise(resolve => {
        walmartCtrl.getPriceWithUpc(upcCode).then(itemPrice => {
            console.log(itemPrice);
            for(var i = 0; i < newItemArray.length; ++i) {
                if(newItemArray[i]===itemName) {
                    if(itemPrice) {
                        newSuggestBgt -= (newPriceList[i]/newQtyList[i])* itemQty;
                    }
                    else {
                        newSuggestBgt -= (newPriceList[i])
                    }
                    if(i != newItemArray.length -1) {
                        if(newQtyList[i] - itemQty <= 0) {
                            newItemArray.splice(i,1);
                            newPriceList.splice(i,1);
                            newQtyList.splice(i,1);
                        } else {
                            newPriceList[i] -= (newPriceList[i]/newQtyList[i])* itemQty;
                            newQtyList[i] -= itemQty;
                        }
                    } else {
                        if(newQtyList[i] - itemQty <= 0) {
                            newItemArray.pop();
                            newPriceList.pop();
                            newQtyList.pop();
                        }
                        else {
                            newPriceList[i] -= (newPriceList[i]/newQtyList[i])* itemQty;
                            newQtyList[i] -= itemQty;
                        }
                    }
                }
            }
                
            var firebaseUpdate = firebase.db.collection("sessions").doc(sessionID).update({
                cartItemsName: newItemArray,
                suggestedBudget: newSuggestBgt,
                cartItemsPrice: newPriceList,
                cartItemsQty: newQtyList
                
            });
        
            var returnToFrontEnd = new Promise( (resolve) => {
                firebaseUpdate.then(() => {
        
                    let frontEndResponse = {};
            
                    var totalQty = 0;
            
                    if(newQtyList.length !== 0) {
                        totalQty = newQtyList.reduce((a, b) => {
                            return a+b;
                        });
                    }
            
                    frontEndResponse = {
                        playerHealth: newSuggestBgt,
                        opponentHealth: totalQty
                    };
            
                    resolve(frontEndResponse);
                });
            });
    
            returnToFrontEnd.then(returnToFrontEnd => {
                resolve(returnToFrontEnd);
            });
        });
    });
}
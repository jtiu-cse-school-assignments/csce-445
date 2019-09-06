var firebase = require('../firebase_config')
var walmart = require('walmart')('h8t5nntr9zehsck3up9pkwzu');
var http = require('http');

module.exports.searchNoCategroy = function(req, res) {
    
    let itemName = req.params.itemName;
    let arrayOfCategoryPaths = [];
    let frontEndResponse = {};
    
    itemName = encodeURI(itemName);

    var jsonOfCategoryPaths = new Promise(function(resolve, reject) {
        var options = {
            host: 'api.walmartlabs.com',
            path: `/v1/search?apiKey=h8t5nntr9zehsck3up9pkwzu&query=${itemName}&facet=on&responseGroup=full&numItems=25`
        };

        http.get(options, (res) => {
            res.setEncoding('utf8');
            let body = '';
            res.on('data', (chunk)=> {
                body += chunk;
            });
            res.on('end', () => {
                resolve(JSON.parse(body));
            });
        });
    });

    jsonOfCategoryPaths.then(walmartResponsePaths => {
        
        var uniqueArrayOfCategoryNodes = [];
        
        for(var i in walmartResponsePaths['items']) {
            arrayOfCategoryPaths.push(walmartResponsePaths['items'][i]['categoryPath']);
        }

        let uniqueArrayOfCategoryPaths = [...new Set(arrayOfCategoryPaths)];

        var jsonOfCategoryNodes = new Promise(function(resolve, reject) {
        
            var options = {
                host: 'api.walmartlabs.com',
                path: `/v1/search?apiKey=h8t5nntr9zehsck3up9pkwzu&query=${itemName}&facet=on&responseGroup=full&numItems=25&start=1`
            };

            http.get(options, (res) => {
                res.setEncoding('utf8');
                let body = '';
                res.on('data', (chunk)=> {
                    body += chunk;
                });
                res.on('end', () => {
                    resolve(JSON.parse(body));
                });
            });
        });

        jsonOfCategoryNodes.then(uniqueWalmartResponseNodes => {
            for(var i in uniqueArrayOfCategoryPaths) {
                for(var j in uniqueWalmartResponseNodes['items']) {
                    if(uniqueArrayOfCategoryPaths[i] === uniqueWalmartResponseNodes['items'][j]['categoryPath']) {
                        uniqueArrayOfCategoryNodes.push(uniqueWalmartResponseNodes['items'][j]['categoryNode']);
                        break;
                    }
                }
            }
        
            frontEndResponse = {
                pathNames: uniqueArrayOfCategoryPaths,
                categoryNodes: uniqueArrayOfCategoryNodes
            };

            res.json(frontEndResponse);
        
        });
    });
}

module.exports.searchWithCategroy = function(name, categoryNode) {
    var response = new Promise(function(resolve, reject) {

        var name2 = name.replace(/\s+/g, '+');

        var options = {
            host: 'api.walmartlabs.com',
            path: `/v1/search?apiKey=h8t5nntr9zehsck3up9pkwzu&query=${name2}&facet=on&categoryId=${categoryNode}&responseGroup=full&numItems=25`
        };

        http.get(options, (res) => {
            res.setEncoding('utf8');
            let body = '';
            res.on('data', (chunk)=> {
                body += chunk;
            });
            res.on('end', () => {
                resolve(JSON.parse(body));
            });
        });
    });

    return response;
}

module.exports.getPriceWithUpc = function(upcCode) {
    var response = new Promise(function(resolve, reject) {
        var options = {
            host: 'api.walmartlabs.com',
            path: `/v1/items?apiKey=h8t5nntr9zehsck3up9pkwzu&upc=${upcCode}`
        };

        http.get(options, (res) => {
            res.setEncoding('utf8');
            let body = '';
            res.on('data', (chunk)=> {
                body += chunk;
            });
            res.on('end', () => {
                resolve(JSON.parse(body));
            });
        });
    });
    
    return new Promise(resolve => {
        response.then(walmartResponse => {
            resolve(walmartResponse['items'][0]['salePrice']);
        });
    });
}
angular.module('starter.services', [])

.factory('DataLoader', ['$http', '$rootScope', '$ionicPopup', '$ionicLoading', '$timeout', '$cordovaFile', 'FileHandler',
        function($http, $rootScope, $ionicPopup, $ionicLoading, $timeout, $cordovaFile, FileHandler) {
    var data = {
        offers: [],
        cards: [],
        cities: [],
        crafts: [],
        offerVisible: {
            temp: [],
            perm: []
        }
    };
    var loaded = false;
    var needUpdate = false;
    
    $rootScope.$on('offers:filter', function(event, filter) {
        data.offersVisible = {
            temp: [],
            perm: []
        };
        for(var i in data.offers) {
            var offer = data.offers[i];

//            if(data.name.length && 
//                offer.name.search(new RegExp(data.name, "i")) === -1 &&
//                (!data.searchDescr || offer.description.search(new RegExp(data.name, "i")) === -1)
//            )  {
//                continue;
//            }
//            if(data.cities.length) {
//                var found = false;
//                for(var ci in data.cities) {
//                    if(data.cities[ci].id === offer.city) {
//                        found = true;
//                        break;
//                    }
//                }
//                if(!found)
//                    continue;
//            }

            if(filter.city && offer.city !== filter.city) {
                continue;
            }
            
            if(filter.crafts.length) {
                var found = false;
                for(var ci in filter.crafts) {
                    for(var ci2 in offer.crafts) {
                        if(offer.crafts[ci2] === filter.crafts[ci].id) {
                            found = true;
                            break;
                        }
                    }
                    if(found)
                        break;
                }
                if(!found)
                    continue;
            }
            
            if(filter.card) {
                var found = false;
                for(var ci in offer.cards) {
                    if(offer.cards[ci] === filter.card) {
                        found = true;
                        break;
                    }
                }
                if(!found)
                    continue;
            }
            
            data.offersVisible[offer.type === 0 ? "perm" : "temp"].push(offer);
        }
        $rootScope.$emit('update:done', data);
    });
    
    return {
        needUpdate: function() { 
            return needUpdate;
        },
        isLoaded: function() {
            return loaded;
        },
        
        getLastUpdateTime: function() { 
            return (data.update ? data.update.lastAt : 1); // troll z 1, jesli ktos poda 0 lub null w parametrze zadania, to pokaze, ze nie ma zadnych aktualizacji
        },
        
        getVisibleOffers: function() {
            return data.offersVisible;
        },
        getOffers: function() {
            return data.offers;
        },
        getOffer: function(id) {
            for(var i = 0; i < data.offers.length; i++) {
                if(id === data.offers[i].id)
                    return data.offers[i];
            }
            return null;
        },
        
        getCities: function() { return data.cities; },
        getCrafts: function() { return data.crafts; },
        getCards: function() { return data.cards; },
        
        getCardName: function(obj) {
            return '<span class="label label-'+obj.color+'">'+obj.name+'</span>';
        },
        getCardNameById: function(id, color, block) {
            for(var i = 0; i < data.cards.length; i++) {
                if(id === data.cards[i].id) {
                    if(!color)
                        return data.cards[i].name;
                    
                    return '<span class="label label-'+data.cards[i].color+(block ? " label-block" : "")+'">'+data.cards[i].name+'</span>';
                }
            }
            return '';
        },
        getCraftName: function(id) {
            for(var i = 0; i < data.crafts.length; i++) {
                if(id === data.crafts[i].id)
                    return data.crafts[i].name;
            }
            return '';
        },
        getCityName: function(id) {
            for(var i = 0; i < data.cities.length; i++) {
                if(id === data.cities[i].id)
                    return data.cities[i].name;
            }
            return '';
        },
        
        clearData: function() {
            FileHandler.delete("settings.dat");
            FileHandler.delete("data.dat");
            FileHandler.delete("offers");
            
            data = {
                offers: [],
                cards: [],
                cities: [],
                crafts: []
            };
            loaded = false;
            needUpdate = true;
            
            $rootScope.$emit('update:done', {clear: true});
        },
        
        
        query: function() {
            return $http.post('http://funkarta.pl/index.php?r=site/update-app').then(function(result) {
                return result.data;
            });
        },
        loadLocally: function() {
            FileHandler.loadFile("data.dat").then(function(success) {
                data = JSON.parse(success);
                loaded = true;
                $rootScope.$emit('data:loaded', data);
            }, function(error) {
                needUpdate = true;
                FileHandler.defaultErrorHandler(error);
                $rootScope.$emit('data:notloaded');
            });
        },
        
        checkForUpdate: function(unix) {
            return $http({
                url: 'http://funkarta.pl/index.php?r=site/check-for-update&date='+(unix || 1),
                method: "GET",
                headers: {
                  'Content-Type': 'text/plain',
                }
            }).then(function(response) {
                var result = response.data;
                result.datetime = moment.unix(result.datetime).format("LLL");
                result.count = parseInt(result.count);
                result.maxPriority = parseInt(result.maxPriority);

                switch(result.maxPriority) {
                    case 0: 
                        result.priorityColor = 'success';
                        result.priorityName = 'Niski';
                        break;
                    case 2:
                        result.priorityColor = 'danger';
                        result.priorityName = 'Wysoki';
                        break;
                    case 1:
                    default:
                        result.priorityColor = 'warning';
                        result.priorityName = 'Średni';
                        break;
                }
                $rootScope.$emit('update:check', result);
                return result;
            });
        },
        
        doUpdate: function() {
            var updateInfo = {
                percents: 0,
                currentTask: 0,
                totalTasks: 0,
                progress: function(i) {
                    updateInfo.currentTask += i;
                    updateInfo.percents = Math.round((updateInfo.currentTask / updateInfo.totalTasks) * 100);
                    angular.element(document.querySelector("div.progress-bar-status"))
                            .css("width", updateInfo.percents + "%");
                }
            };
            var $this = this;
            $ionicLoading.show({
                template: "<div class='update-loading'><p>Aktualizacja w toku...</p>\n\
                    <div class='progress-bar'>\n\
                        <div class='progress-bar-status'></div>\n\
                    </div></div>",
            });
    //window.webkitStorageInfo.queryUsageAndQuota(webkitStorageInfo.PERSISTENT, //the type can be either TEMPORARY or PERSISTENT
    //function(used, remaining) {
    //  alert("Used quota: " + JSON.stringify(used) + ", remaining quota: " + JSON.stringify(remaining));
    //}, function(e) {
    //  alert('Error: ' + JSON.stringify(e)); 
    //} );
            var internalSaveOffers = function(result, success) {
                var counter = 0
                updateInfo.totalTasks = result.offers.length;
                for(var i = 0; i < result.offers.length; i++) {
                    FileHandler.download("http://funkarta.pl/files/offers/"+result.offers[i].image+".png", cordova.file.dataDirectory + "offers/"+result.offers[i].image)
                    .then((function(offer) { return function(success) {
                        offer.path = cordova.file.dataDirectory + "offers/" + offer.image;
                        updateInfo.progress(1);
                        if(++counter === result.offers.length) {
                            result.update = {
                                lastAt: Math.floor(Date.now()/1000)
                            };
                            data = result;
                            loaded = true;
                            needUpdate = false; // dla pewności
                            $rootScope.$emit('update:done', data);
                            FileHandler.saveFile("data.dat", JSON.stringify(result));
                            angular.element(document.querySelector(".update-loading")).html("<h3>Aktualizacja wykonana poprawnie!</h3>");
                            $timeout(function() { $ionicLoading.hide(); }, 2500);
                        }
                        }; 
                    }(result.offers[i])));
                }
            };
            var internalSaveCards = function(result, success) {
                for(var i = 0; i < result.cards.length; i++) {
                    FileHandler.download("http://funkarta.pl/files/cards/"+result.cards[i].image+".png", cordova.file.dataDirectory + "cards/"+result.cards[i].image+".png");
                }
            };
            $this.query().then(function(result) {
                $cordovaFile.checkDir(cordova.file.dataDirectory, "offers").then(function(success) {
                    internalSaveOffers(result, success);
                }, function(error) {
                    $cordovaFile.createDir(cordova.file.dataDirectory, "offers", true).then(function(success) {
                        internalSaveOffers(result, success);
                    });
                });
                
                $cordovaFile.checkDir(cordova.file.dataDirectory, "cards").then(function(success) {
                    internalSaveCards(result, success);
                }, function(error) {
                    $cordovaFile.createDir(cordova.file.dataDirectory, "cards", true).then(function(success) {
                        internalSaveCards(result, success);
                    });
                });
            });
        }
    };
}])

.factory('FileHandler', function($cordovaFile, $cordovaFileTransfer) {
    var files = {};
    return {
        saveFile: function(filename, data, errorHandler) {
            return $cordovaFile.writeFile(cordova.file.dataDirectory, filename, data, true).then(function(success) { return success; }, function(error) {
                this.defaultErrorHandler(error, "FileHandler.saveFile");
            });
        },
        loadFile: function(filename, opts) {
            var promise = $cordovaFile.readAsText(cordova.file.dataDirectory, filename);
            if(opts && opts.json) {
                promise.then(function(success) {
                    files[filename] = JSON.parse(success);
                    return files[filename];
                });
            }
            return promise;
        },
        download: function(url, target, options, trustHosts) {
            return $cordovaFileTransfer.download(url, target, options, trustHosts);
        },
        delete: function(path, type) {
            if(type === "dir") 
                $cordovaFile.removeRecursively(cordova.file.dataDirectory, path);
            else
                $cordovaFile.removeFile(cordova.file.dataDirectory, path);
        },
        
        defaultErrorHandler: function(error, from) {
            // TODO: logowanie błędów i może wysyłanie na serwer za zgodą użytkownika ? 
            console.error((from ? (from+'\n') : '')+"Błąd: " + this.getError(error.code));
        },
        
        getError: function(code) {
            switch(code) {
                case 1: // NOT_FOUND_ERR
                    return 'Plik nie został odnaleziony';
                case 2: // SECURITY_ERR
                    return 'Błąd bezpieczeństwa';
                case 3: // ABORT_ERR
                    return 'Przerwano';
                case 4: // NOT_READABLE_ERR
                    return 'Plik nieodczytywalny'; // (?)
                case 5: // ENCODING_ERR
                    return 'Błąd kodowania';
                case 6: // NO_MODIFICATION_ALLOWED_ERR
                    return 'Modyfikacje nie są dozwolone';
                case 7: // INVALID_STATE_ERR
                    return 'Niepoprawny stan'; // (?)
                case 8: // SYNTAX_ERR
                    return 'Błąd składni';
                case 9: // INVALID_MODIFICATION_ERR
                    return 'Niepoprawna modyfikacja'; // (?)
                case 10: // QUOTA_EXCEEDED_ERR
                    return 'Przekroczono limit dostępnej pamięci';
                case 11: // TYPE_MISMATCH_ERR
                    return 'Niezgodność typów'; // (?)
                case 12: // PATH_EXISTS_ERR
                    return 'Plik/Folder już istnieje pod tą ścieżką'; // (?)
            }
            return '';
        },
        
        get: function(filename, variable) {
            if(!files[filename])
                return null;
            
            return (variable ? files[filename][variable] : files[filename]);
        }
    };
})

.factory('FilterData', function(DataLoader) {
    var data = {
        cities: [],
        crafts: [],
        cards: [],
        
        checked: {
            cities: 0,
            crafts: 0,
            cards: 0
        },
        
        city: 0,
        card: null,
        name: '',
        searchDescr: false,
        
        // przygotowanie form'a do wysłania - pozostawienie tylko zaznaczonych opcji
        prepare: function() {
            var send = {
                cities: [],
                crafts: [],
                cards: [],
                name: data.name,
                searchDescr: data.searchDescr,
                city: data.city,
                card: data.card
            };
            
//            for(var i in data.cities) {
//                data.cities[i].id = parseInt(data.cities[i].id);
//                if(data.cities[i].checked) 
//                    send.cities.push(data.cities[i]);
//            }
            
//            for(var i in data.cards) {
//                data.cards[i].id = parseInt(data.cards[i].id);
//                if(data.cards[i].checked) {
//                    send.cards.push(data.cards[i]);
//                    break; // tutaj tylko pojedyńczy wybór
//                }
//            }
            
            for(var i in data.crafts) {
                data.crafts[i].id = parseInt(data.crafts[i].id);
                if(data.crafts[i].checked) 
                    send.crafts.push(data.crafts[i]);
            }
            
            return send;
        },
        load: function() {
            this.cities = [];
            var cities = DataLoader.getCities();
            for(var i in cities) {
                this.cities[i] = {id: cities[i].id, name: cities[i].name, checked: false};
            }
            this.crafts = [];
            var crafts = DataLoader.getCrafts();
            for(var i in crafts) {
                this.crafts[i] = {id: crafts[i].id, name: crafts[i].name, checked: false};
            }
            this.cards = [];
            var cards = DataLoader.getCards();
            for(var i in cards) {
                this.cards[i] = {id: cards[i].id, name: cards[i].name, color: cards[i].color, checked: false, image: cards[i].image};
            }
            return this;
        }
    };

    return data.load();
})

.factory('LocalStorage', ['$window', function($window) {
  return {
    set: function(key, value) {
      $window.localStorage[key] = value;
    },
    get: function(key, defaultValue) {
      return $window.localStorage[key] || defaultValue;
    },
    setObject: function(key, value) {
      $window.localStorage[key] = JSON.stringify(value);
    },
    getObject: function(key) {
      return JSON.parse($window.localStorage[key] || '{}');
    }
  };
}]);

angular.module('starter.controllers', [])

.controller('DashCtrl', function($scope, DataLoader, $rootScope) {
    $scope.updateInfo = {count: -1};
    
    $scope.doUpdate = function() {
        DataLoader.doUpdate();
    };
    
    $rootScope.$on('update:check', function(event, result) {
        $scope.updateInfo = result;
    });
    $rootScope.$on('update:done', function(event, result) {
        $scope.updateInfo = {count: (result.clear ? -1 : 0)};
    });
    
    $scope.checkForUpdate = function() {
        DataLoader.checkForUpdate(DataLoader.getLastUpdateTime());
    };
    
    $scope.getLastUpdated = function() {
        var lastAt = DataLoader.getLastUpdateTime();
        if(lastAt === 1)
            return 'Nigdy';
        
        return moment.unix(lastAt).format('LLL');
    };
    $scope.needUpdate = function() { return DataLoader.needUpdate(); };
})

.controller('OffersCtrl', 
    ['$scope', '$ionicModal', '$ionicPopup', 'DataLoader', '$rootScope',
    function($scope, $ionicModal, $ionicPopup, DataLoader, $rootScope) {
    $scope.shouldShowDelete = false;
    $scope.offersLoaded = DataLoader.isLoaded();
    
    var offers = DataLoader.getOffers();
    $scope.offersVisible = DataLoader.getVisibleOffers();
    $scope.offerTotal = (offers ? offers.length : 0);
    
    var updateFunction = function(event, data) {
        $scope.offers = $scope.offersVisible = DataLoader.getOffers();
        $scope.offerTotal = $scope.offers.length;
        $scope.offersLoaded = (data.clear ? false : true);
        //$scope.$apply();         // wymuszamy odświeżenie widoku
    };
    $rootScope.$on('data:loaded', updateFunction);
    $rootScope.$on('update:done', updateFunction);
    
    $scope.dataLoader = DataLoader;

//    jeżeli będzie trzeba - tutaj można zrobić iterację po modalach i jeśli znajdzie jakiegoś isShown(), wtedy go wyłączać. 
//    $ionicPlatform.registerBackButtonAction(function () {
//    //close your ionic modal here
//    }, 100);

}])

.controller('OfferFilterCtrl', function($scope, $ionicModal, DataLoader, $rootScope, $location, FilterData) {
    // desctructor controllera taki jakby
    $scope.$on('$destroy', function() {
        for(var i in $scope.modals)
            $scope.modals[i].remove();
    });
    
    var onLoad = function(result) {
        $scope.form = $scope.form.load();
        $scope.needUpdate = DataLoader.needUpdate();
    };
    $rootScope.$on('data:loaded', onLoad);
    $rootScope.$on('update:done', onLoad);
    
    $rootScope.$on('data:notloaded', function() { 
        $scope.needUpdate = DataLoader.needUpdate();
    });
    
    $scope.needUpdate = DataLoader.needUpdate();
    
    $scope.doUpdate = function() {
        DataLoader.doUpdate();
    };
    
    $scope.form = FilterData;
    
    $scope.getCardImage = function(image) {
        return cordova.file.dataDirectory + 'cards/' + image + '.png';
    };

    $scope.modals = {};

//    $ionicModal.fromTemplateUrl('templates/popovers/offers-filter-cards-choose.html', {scope: $scope,animation: 'slide-in-up'}).then(function(modal) {$scope.modals['cards-choose'] = modal;});
    $ionicModal.fromTemplateUrl('templates/popovers/offers-filter-city-choose.html', {scope: $scope,animation: 'slide-in-up'}).then(function(modal) {$scope.modals['city-choose'] = modal;});
//    $ionicModal.fromTemplateUrl('templates/popovers/offers-filter-craft-choose.html', {scope: $scope,animation: 'slide-in-up'}).then(function(modal) {$scope.modals['craft-choose'] = modal;});
    
    $scope.openModal = function($event, id) {
        var modal = $scope.modals[id];
        if(modal) 
            modal.show();
    };
    $scope.closeModal = function($event, id) {
        var modal = $scope.modals[id];
        if(modal && modal.isShown())
            modal.hide();

        if($event) {
            $event.stopPropagation();
            $event.preventDefault();
        }
    };
    
    $scope.setAll = function($event, type, value) {
        for(var i in $scope.form[type]) {
            $scope.form[type][i].checked = value;
        }
        $scope.form.checked[type] = (value ? $scope.form[type].length : 0);
    };
    
    $scope.onChange = function(type, key) {
        $scope.form.checked[type] += ($scope.form[type][key].checked ? 1 : -1);
    };
    $scope.onChangeCard = function(id) {
        if($scope.form.card === id)
            $scope.form.card = null;
        else
            $scope.form.card = id;
    };
    $scope.getCityName = function(id) {
        var id = parseInt(id);
        return (id === 0 ? 'Wszystkie miasta' : DataLoader.getCityName(id));
    };
    $scope.test = function() {
        alert($scope.form.city);
    };
    
    $scope.clearForm = function() {
        $scope.setAll(null, 'cities', false);
        $scope.setAll(null, 'cards', false);
        $scope.setAll(null, 'crafts', false);
        $scope.form.name = '';
        $scope.form.searchDescr = false;
    };
    
    $scope.search = function() {
        $rootScope.$emit('offers:filter', $scope.form.prepare());
        $location.url('/tab/offers');
    };
    
})

.controller('OfferDetailCtrl', function($scope, $stateParams, DataLoader) {
    $scope.offer = DataLoader.getOffer(parseInt($stateParams.offerId));
    
    $scope.getCardName = function(id) {
        return DataLoader.getCardNameById(id, true, true);
    };
    $scope.getCraftName = function(id) {
        return DataLoader.getCraftName(id);
    };
    $scope.getCityName = function(id) {
        return DataLoader.getCityName(id);
    };
    $scope.getImage = function() {
        return cordova.file.dataDirectory + "offers/" + $scope.offer.image + ".png";
    };
    $scope.getOfferEnd = function() {
        return moment.unix($scope.offer.date_end).format('LLL');
    };
})

.controller('SettingsCtrl', function($scope, DataLoader, $ionicPopup, $rootScope, FileHandler) {
    $scope.settings = {
        automaticUpdateCheck: FileHandler.get("settings.dat", "automaticUpdateCheck")
    };
    $scope.update = function() {
        $ionicPopup.confirm({
            title: 'Czy jesteś pewien?',
            template: 'Zostanie pobrana i zapisana dość spora ilość danych - czy chcesz kontynuować?'
        }).then(function(res) {
           if(!res)
              return;

          DataLoader.doUpdate();
       });
    };
    $scope.onChange = function() {
        FileHandler.saveFile("settings.dat", JSON.stringify($scope.settings));
    };
    $scope.deleteFiles = function() {
      $ionicPopup.confirm({
          title: 'Czy jesteś pewien?',
          template: 'Zostaną usunięte wszystkie oferty i inne dane. Aplikacja do działania będzie potrzebowała ponownej aktualizacji. Czy chcesz kontynuować?'
      }).then(function(res) {
            if(!res)
                return;

            DataLoader.clearData();

            $ionicPopup.alert({
                title: 'Usunięto dane',
                template: 'Wszystkie dane zostały poprawnie usunięte.'
            });
      });
    };
      $scope.about = function() {
          $ionicPopup.alert({
              title: "FUNkarta",
              template: "StrychPolska 2015<br/>Wersja: 1.0.3 (beta)<br/><br/>Wersja rozwojowa. Wszelkie błędy prosimy zgłaszać na naszej stronie.<br/>www.funkarta.pl"
          });
      };
});

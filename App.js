Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',
    items: [
        {
        xtype: 'container',
        itemId: 'filter-Box', 
        layout: {
            type: 'hbox',
            align: 'stretch'
            }
        }
    ],

    launch: function() {
        var app = this;

        app._setReleaseDate();
    },

    _setReleaseDate: function() {
        var app = this; 

        var releaseDateField = Ext.create('Ext.Container', {
            items: [{
                itemId: 'release-Date',
                xtype: 'rallydatefield',
                fieldLabel: 'Release Date',
                labelAlign: 'left',
                listeners: {
                    select: app._loadData,
                    scope: app
                    }                  
            }],
            renderTo: Ext.getBody().dom
        });

        app.down('#filter-Box').add(releaseDateField);
    },

    _loadData: function() {
        var app = this;

        app.releaseDate = app.down('#release-Date').getValue();

        var storyFilter = app._setStoryFilter(app.releaseDate);

        app.itemStore = Ext.create('Rally.data.wsapi.Store', {
            model: 'User Story',
            autoLoad: true,
            filters: storyFilter,
            limit: Infinity, 
            listeners: {
                load: function(myStore, myData, success) {
                    app._processStories();
                },
                scope: app    
            },
            fetch: ['FormattedID','ObjectID', 'Name', 'c_ReleaseDate']
        });
    },

    _setStoryFilter: function(rDate) {

        var rFilter1 = Ext.create('Rally.data.wsapi.Filter', {
            property: 'c_ReleaseDate',
            operator: '>=',
            value: rDate
        });

        var d = Ext.Date.add(rDate, Ext.Date.DAY, +1);

        var rFilter2 = Ext.create('Rally.data.wsapi.Filter', {
            property: 'c_ReleaseDate',
            operator: '<',
            value: d
        });

        rFilter3 = Ext.create('Rally.data.wsapi.Filter', {
            property: 'Defects.ObjectID',
            operator: '!=',
            value: 'null'
        });

        return rFilter1.and(rFilter2).and(rFilter3);
    },

    _processStories: function() {
        var app = this;

		var storyList = '';

        app.itemStore.each(function(record) {
            var item = record.get('ObjectID');
            storyList = app._setFilter(item, storyList);
        });

        console.log('Stories matched', app.itemStore.getTotalCount());

        if(app.itemStore.getTotalCount() === 0) {
            console.log('No Entries');
            storyList = app._setFilter('000000000', storyList);
        }
        
//        if(app.defectStore) {
//            app.defectStore.setFilter(storyList);
//            app.defectStore.load();
//        } else {

//        if(app.defectStore) {
//            app.defectStore.removeAll();
            console.log(storyList);
//        }

        console.log('Create defect store');
            Ext.create('Rally.data.wsapi.TreeStoreBuilder').build({
                models: ['defect'],
                autoLoad: true,
                enableHierarchy: true,
                filters: storyList,
                limit: Infinity, 
                fetch: [
                    'FormattedID', 
                    'Name', 
                    'Owner', 
                    'Project', 
                    'Requirement', 
                    'State', 
                    'ScheduleState', 
                    'Severity', 
                    'Priority'
                ]
            }).then({
                success: function(store) {
                    this._createGrid(store);
                },
                scope: app
            });
  //      }
    },

    _setFilter: function(story, cFilter) {
        var app = this;

        var dFilter = Ext.create('Rally.data.wsapi.Filter', {
            property: 'Requirement.ObjectID',
            operator: '=',
            value: story
        });

        if(cFilter === '') {
            return(dFilter);
        } else {
            return(cFilter.or(dFilter));
        }
    },

    _createGrid: function(store) {
        var app = this;

        console.log('Create Grid');
        console.log(store);

        var modelNames = ['defect'],
            context = app.getContext();
                    
        app.add({
            xtype: 'rallygridboard',
            context: context,
            modelNames: modelNames,
            toggleState: 'grid',
            stateful: false,
            plugins: [
                {
                    ptype: 'rallygridboardactionsmenu',
                    menuItems: [
                        {
                            text: 'Export...',
                            handler: function() {
                                window.location = Rally.ui.gridboard.Export.buildCsvExportUrl(
                                    this.down('rallygridboard').getGridOrBoard());
                            },
                            scope: this
                        }
                    ],
                    buttonConfig: {
                        iconCls: 'icon-export'
                    }
                }
            ],
            gridConfig: {
                store: store,
                columnCfgs: [
                    'FormattedID', 
                    'Name', 
                    'Owner', 
                    'Project', 
                    'Requirement', 
                    'State', 
                    'ScheduleState', 
                    'Severity', 
                    'Priority'
                ]
            },
            height: this.getHeight()
        });
    }
});
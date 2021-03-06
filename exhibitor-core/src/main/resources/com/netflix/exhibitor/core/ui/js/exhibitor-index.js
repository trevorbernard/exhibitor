var ACTION_NAMES = [
    "Create-Persistent",
    "Create-Ephemeral",
    "Delete",
    "Set Data"
];

var restoreDialogNames = null;
function updateBackups()
{
    var filterValue = parseInt($('#new-index-backup-names-filter').val());

    var options = "";
    var now = new Date();
    var actualCount = 0;
    for ( var i = 0; i < restoreDialogNames.length; ++i )
    {
        var d = new Date(restoreDialogNames[i].modifiedDate);
        if ( (filterValue < 0) || ((now.getTime() - d.getTime()) <= filterValue) )
        {
            options += '<option id="existing-backup-' + i + '">' + restoreDialogNames[i].name + ' - ' + d.toGMTString() + '</option>';
            ++actualCount;
        }
    }
    $('#new-index-backup-names').html(options);
    for ( i = 0; i < restoreDialogNames.length; ++i )
    {
        var val = JSON.stringify(restoreDialogNames[i]);
        $("#existing-backup-" + i).val(val);
    }

    if ( actualCount > 0 )
    {
        $('#new-index-radio-backup').attr('disabled', false);
    }
    else
    {
        if ( $('#new-index-radio-backup').attr('checked') )
        {
            $('#new-index-radio-default').attr('checked', true);
        }
        $('#new-index-radio-backup').attr('disabled', true);
    }
}

function loadBackups()
{
    $.getJSON(URL_GET_BACKUPS, function(data){
        restoreDialogNames = $.makeArray(data);
        if ( restoreDialogNames.length == 0 )
        {
            $('#new-index-backups-section').hide();
        }
        else
        {
            updateBackups();
            $('#new-index-backups-section').show();
        }
        $('#new-index-loading-dialog').dialog("close");
        $('#new-index-dialog').dialog("open");
    });
}

function initRestoreUI()
{
    $('#restore-open-button').button({
        icons:{
            primary:"ui-icon-folder-open"
        }
    }).click(function(){
            var radio = $('input:radio:checked[name="restore-item-radio"]');
            openIndex(radio.val());
            return false;
        });

    $('#restore-delete-button').button({
        icons:{
            primary:"ui-icon-trash"
        }
    }).click(function(){
            okCancelDialog("Delete Index", "Are you sure you to delete the selected index? This CANNOT be un-done.", function ()
            {
                var radio = $('input:radio:checked[name="restore-item-radio"]');
                $.ajax({
                    type: 'DELETE',
                    url: URL_DELETE_INDEX_BASE + radio.val()
                });
                messageDialog('Index', 'Index is marked for deletion. Check the log for details.');
            });
            return false;
        });

    $('#restore-index-button').button({
        icons:{
            primary:"ui-icon-document"
        }
    }).click(function(){
            if ( systemState.backupActive )
            {
                $('#new-index-loading-dialog').dialog("open");
                loadBackups();
            }
            else
            {
                $('#new-index-dialog').dialog("open");
            }
            return false;
        });

    $('#index-query-filter-button').button({
        icons:{
            primary:"ui-icon-search"
        }
    }).click(function(){
            $('#index-query-dialog').dialog("open");
            return false;
        });
    $('#index-query-clear-filter-button').button({
        icons:{
            primary: "ui-icon-close"
        },
        disabled: true
    }).click(function(){
            var indexName = $('#index-query-dialog').attr("indexName");
            openIndex(indexName);
            return false;
        });
    $('#index-query-clear-restore-button').button({
        icons:{
            primary: "ui-icon-alert"
        },
        disabled: true
    }).click(function(){
            openModifyDialog((selectedIndexData.type == 2) ? "delete" : "update", selectedIndexData.path, selectedIndexData.dataBytes, "binary");
            return false;
        });

    $('#index-query-dialog').dialog({
        modal: true,
        autoOpen: false,
        title: 'Search Index',
        minWidth: 400
    });
    $('#index-query-from').datepicker({
        dateFormat: "yy-mm-dd"
    });
    $('#index-query-to').datepicker({
        dateFormat: "yy-mm-dd"
    });
    $('#index-query-dialog').dialog("option", "buttons",
        {
            "Cancel":function ()
            {
                $(this).dialog("close");
            },

            "OK":function ()
            {
                var indexName = $('#index-query-dialog').attr("indexName");
                var indexHandle = $('#index-query-dialog').attr("indexHandle");
                var searchRequest = buildSearchRequestFromFilter(indexName, indexHandle);
                $(this).dialog("close");
                filterIndex(indexName, searchRequest, true);
            }
        }
    );

    $('#new-index-loading-progressbar').progressbar({
        value: 100
    });
    $('#new-index-loading-dialog').dialog({
        modal: true,
        autoOpen: false,
        title: 'Loading...',
        resizable: false,
        height: 100
    });

    $('#new-index-dialog').dialog({
        modal: true,
        autoOpen: false,
        title: 'New Index',
        minWidth: 450
    });
    $('#new-index-dialog').dialog("option", "buttons",
        {
            "Cancel":function ()
            {
                $(this).dialog("close");
            },

            "OK":function ()
            {
                var newIndexRequest = {};
                newIndexRequest.type = $('input[name=new-index-specified]:checked').val();
                if ( newIndexRequest.type === "path" )
                {
                    newIndexRequest.value = $('#new-index-path').val();
                }
                else if ( newIndexRequest.type === "backup" )
                {
                    newIndexRequest.value = "";
                    newIndexRequest.backup = JSON.parse($("#new-index-backup-names option:selected").val());
                }
                else
                {
                    newIndexRequest.value = "";
                }

                $(this).dialog("close");
                var payload = JSON.stringify(newIndexRequest);
                $.ajax({
                    type: 'POST',
                    url: URL_NEW_INDEX,
                    data: payload,
                    contentType: 'application/json'
                });
                messageDialog('Index', 'Indexing has started. Check the log for details.');
            }
        }
    );

    $('#new-index-path').focus(function(){
        $('#new-index-radio-path').prop("checked", true);
    });
    $('#new-index-radio-backup').click(function(){
        if ( !$('#new-index-backup-names').val() )
        {
            $('#new-index-backup-names').prop("selectedIndex", 0);
        }
    });
    $('#new-index-backup-names').focus(function(){
        $('#new-index-radio-backup').prop("checked", true);
    });
    $('#new-index-backup-names-filter').change(function(){
        updateBackups();
    });

    $('#index-query-results-dialog').dialog({
        modal: true,
        autoOpen: false,
        title: 'Results',
        minWidth: 800
    });
}

var currentRestoreItemsContent = null;
var currentRestoreItemsDataTable = null;
function updateRestoreItems(selectedRadio)
{
    $.getJSON(URL_GET_INDEXES, function(data){
        var itemsTab = data ? $.makeArray(data) : new Array();

        var needsCheck = true;
        var content = "";
        for ( var i = 0; i < itemsTab.length; ++i )
        {
            var item = itemsTab[i];
            content += '<tr>';
            content += '<td><input type="radio" id="restore-item-radio-' + i + '" name="restore-item-radio" value="' + item.name + '"';
            if ( selectedRadio )
            {
                if ( selectedRadio === item.name )
                {
                    content += " CHECKED";
                    needsCheck = false;
                }
            }
            content += '></td>';
            content += '<td>' + item.name + '</td>';
            content += '<td>' + item.from + '</td>';
            content += '<td>' + item.to + '</td>';
            content += '<td>' + item.entryCount + '</td>';
            content += '</tr>';
        }

        if ( content != currentRestoreItemsContent )
        {
            currentRestoreItemsContent = content;

            if ( currentRestoreItemsDataTable )
            {
                currentRestoreItemsDataTable.fnDestroy();
            }
            $('#restore-items-table-body').html(content);
            currentRestoreItemsDataTable = $('#restore-items-table').dataTable({
                bPaginate: false,
                bLengthChange: false,
                bSort: false,
                bInfo: false,
                bFilter: false,
                bAutoWidth: false
            });

            if ( needsCheck && (itemsTab.length > 0) )
            {
                $('#restore-item-radio-0').prop("checked", true);
            }

            $("#restore-open-button").button((itemsTab.length > 0) ? "enable" : "disable");
            $("#restore-delete-button").button((itemsTab.length > 0) ? "enable" : "disable");
        }
    });
}

var selectedIndexData = null;
function applySelectedValue(data)
{
    selectedIndexData = data;

    $('#index-query-results-selected-path').html(data.path);
    $('#index-query-results-selected-date').html(data.date);
    $('#index-query-results-selected-data-bytes').html(data.dataBytes);
    $('#index-query-results-selected-data-string').html(data.dataAsString);
}

function viewIndex(indexName, indexHandle, isFromFilter)
{
    $('#index-query-dialog').attr("indexName", indexName);
    $('#index-query-dialog').attr("indexHandle", indexHandle);

    var emptyData = {
        type: 0,
        date: "",
        path: "",
        dataBytes: "",
        dataAsString: ""
    };
    applySelectedValue(emptyData);
    var selectedRowId = -1;
    $('#index-query-results-table').dataTable({
        sAjaxSource: URL_INDEX_DATA_BASE + indexName + "/" + indexHandle,
        bDestroy: true,
        bProcessing: true,
        bServerSide: true,
        bStateSave: false,
        bFilter: false,
        bSort: false,
        sScrollY: "300px",
        sDom: "frtiS",
        bDeferRender: true,
        iDeferLoading: false,
        fnRowCallback: function( row, data, index ) {
            if ( data.DT_RowId === selectedRowId ) {
                $(row).addClass('row_selected');
            }
            return row;
        }
    });

    $('#index-query-results-table tbody tr').live('click', function () {
        var id = this.id;
        if ( id != selectedRowId )
        {
            if ( selectedRowId != -1 )
            {
                $('#' + selectedRowId).removeClass('row_selected');
            }

            selectedRowId = id;
            $(this).addClass('row_selected');

            var docId = selectedRowId.split('-').pop();
            $.getJSON(URL_GET_INDEX_BASE + indexName + "/" + docId, applySelectedValue);
            $('#index-query-clear-restore-button').button("option", "disabled", false);
        }
    });

    $('#index-query-clear-filter-button').button("option", "disabled", !isFromFilter);
    $('#index-query-clear-restore-button').button("option", "disabled", true);

    $('#index-query-results-dialog').bind('dialogclose', function(event, ui) {
        $.get(URL_RELEASE_CACHE_INDEX_SEARCH_BASE + indexName + '/' + indexHandle);
    });

    $('#index-query-results-dialog').dialog("option", "title", 'Results for ' + indexName);
    $('#index-query-results-dialog').dialog("option", "maxHeight", 600);
    $('#index-query-results-dialog').dialog("open");
}

function buildSearchRequestFromFilter(indexName, indexHandle)
{
    var searchRequest = {};
    searchRequest.indexName = indexName;
    searchRequest.reuseHandle = indexHandle;
        searchRequest.pathPrefix = $('#index-query-path').val().trim();
    searchRequest.operationType = ($('#index-query-type').val() === "") ? null : $('#index-query-type').val();
    searchRequest.maxResults = $('#index-query-max').val();
    searchRequest.firstDate = $('#index-query-from').datepicker("getDate");
    searchRequest.secondDate = $('#index-query-to').datepicker("getDate");

    return searchRequest;
}

function filterIndex(indexName, searchRequest, isFromFilter)
{
    var payload = JSON.stringify(searchRequest);
    $.ajax({
        type: 'POST',
        url: URL_CACHE_INDEX_SEARCH,
        data: payload,
        contentType: 'application/json',
        success: function(data){
            viewIndex(indexName, data.id, isFromFilter);
        }
    });
}

function openIndex(indexName)
{
    var searchRequest = {};
    searchRequest.indexName = indexName;
    searchRequest.pathPrefix = "";
    searchRequest.operationType = -1;
    searchRequest.reuseHandle = null;
    searchRequest.maxResults = 0;

    filterIndex(indexName, searchRequest, false);
}

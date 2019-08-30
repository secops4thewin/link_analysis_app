$("#modal1").append($("<button class=\"btn btn-primary\" >Launch Modal</button>").click(function() {

    // The require will let us tell the browser to load Modal.js with the name "Modal"
    require(['jquery',
        "/static/app/SA-devforall/ex05-creating-modal-dialog/Modal.js"
    ], function($,
        Modal) {
        // Now we initialize the Modal itself
        var myModal = new Modal("modal1", {
            title: "I Love Modals",
            backdrop: 'static',
            keyboard: false,
            destroyOnHide: true,
            type: 'normal'
        });

        $(myModal.$el).on("hide", function() {
            // Not taking any action on hide, but you can if you want to!
        })

        myModal.body
            .append($('<p>Here is what goes in the body.. feel free to add Splunk inputs, reports, etc. Whatever your heart and SplunkJS skill desires.</p>'));

        myModal.footer.append($('<button>').attr({
            type: 'button',
            'data-dismiss': 'modal'
        }).addClass('btn btn-primary').text('Close').on('click', function() {
            // Not taking any action on Close... but I could!        
        }))
        myModal.show(); // Launch it!

    })
}))

$("#modal2").append($("<button class=\"btn btn-primary\">Launch Modal</button>").click(function() {
    // The require will let us tell the browser to load Modal.js with the name "Modal"
    require(['jquery',
        "/static/app/SA-devforall/ex05-creating-modal-dialog/Modal.js"
    ], function($,
        Modal) {
        // Now we initialize the Modal itself
        var myModal = new Modal("modal1", {
            title: "I Love Modals",
            backdrop: 'static',
            keyboard: false,
            destroyOnHide: true,
            type: 'normal'
        });

        $(myModal.$el).on("hide", function() {
            if ($("#modal2Result_number").length == 0) {
                $("#modal2Result").html("<p>You have opened that modal <span id=\"modal2Result_number\">1</span> time(s)</p>")
            } else {
                $("#modal2Result_number").text(parseInt($("#modal2Result_number").text()) + 1)
            }
        })

        myModal.body
            .append($('<p>Here is what goes in the body.. feel free to add Splunk inputs, reports, etc. Whatever your heart and SplunkJS skill desires.</p>'));

        myModal.footer.append($('<button>').attr({
            type: 'button',
            'data-dismiss': 'modal'
        }).addClass('btn btn-primary').text('Close').on('click', function() {
            // Not taking any action on Close... but I could!        
        }))
        myModal.show(); // Launch it!

    })
}))



$("#modal3").append($("<button class=\"btn btn-primary\">Launch Modal</button>").click(function() {
    // The require will let us tell the browser to load Modal.js with the name "Modal"
    require(['jquery',
        "/static/app/SA-devforall/ex05-creating-modal-dialog/Modal.js"
    ], function($,
        Modal) {
        // Now we initialize the Modal itself
        var myModal = new Modal("modal1", {
            title: "I Love Modals",
            backdrop: 'static',
            keyboard: false,
            destroyOnHide: true,
            type: 'normal'
        });

        $(myModal.$el).on("hide", function() {

        })

        myModal.body
            .append($('<p>Here is what goes in the body.. feel free to add Splunk inputs, reports, etc. Whatever your heart and SplunkJS skill desires.</p>'));

        myModal.footer.append($('<button>').attr({
            type: 'button',
            'data-dismiss': 'modal'
        }).addClass('btn').text('Decrease').on('click', function() {
            if ($("#modal3Result_number").length == 0) {
                $("#modal3Result").html("<p>My counter is now at <span id=\"modal2Result_number\">-1</span></p>")
            } else {
                $("#modal3Result_number").text(parseInt($("#modal3Result_number").text()) - 1)
            }
        }), $('<button>').attr({
            type: 'button',
            'data-dismiss': 'modal'
        }).addClass('btn btn-primary').text('Increase').on('click', function() {
            if ($("#modal3Result_number").length == 0) {
                $("#modal3Result").html("<p>My counter is now at <span id=\"modal3Result_number\">1</span></p>")
            } else {
                $("#modal3Result_number").text(parseInt($("#modal3Result_number").text()) + 1)
            }
        }))
        myModal.show(); // Launch it!

    })
}))


$("#modal4").append($("<button class=\"btn btn-primary\" >Launch Modal</button>").click(function() {
    // The require will let us tell the browser to load Modal.js with the name "Modal"
    require(['jquery',
        "/static/app/SA-devforall/ex05-creating-modal-dialog/Modal.js",
        'splunkjs/mvc/dropdownview',
        "splunkjs/mvc/simpleform/input/dropdown"
    ], function($,
        Modal,
        DropdownView,
        DropdownInput) {
        // Now we initialize the Modal itself
        var myModal = new Modal("modal1", {
            title: "I Love Modals",
            backdrop: 'static',
            keyboard: false,
            destroyOnHide: true,
            type: 'normal'
        });

        $(myModal.$el).on("show", function() {
            // There's a challenge here. The "show" event fires before the events actually render. So we're setting a timeout to cause it to load the 
            // Splunk control after the element loads. This is.. definitely bad form. Maybe lazy? But does work well!
            setTimeout(function() {
                var dropdownTest = new DropdownView({
                    id: 'myDropdown',
                    el: $('#dropdown_example'),
                    labelField: 'label',
                    valueField: 'value',
                    showClearButton: false,
                    choices: [{ value: 'optionone', label: 'Option One' }, { value: 'optiontwo', label: 'Option Two' }, { value: 'optionthree', label: 'Option Three' }]
                }).render();
            }, 300)

        })

        myModal.body
            .append($('<p>Here is what goes in the body.. feel free to add Splunk inputs, reports, etc. Whatever your heart and SplunkJS skill desires.</p><p>I\'ll warn you though, things can get complicated when you add in other objects.</p><div id="dropdown_example"></div>'));

        myModal.footer.append($('<button>').attr({
            type: 'button',
            'data-dismiss': 'modal'
        }).addClass('btn btn-primary').text('Close').on('click', function() {
            // Not taking any action here
        }))
        myModal.show(); // Launch it!

    })
}))

//# sourceURL=ex05-creating-modal-dialog.js
/*global SqdCalculator _config*/

var SqdCalculator = window.SqdCalculator || {};

(function flightStatusScopeWrapper($) {
    var authToken;
    var authTokenLoaded = false;
    var isDocReady = false;
    SqdCalculator.authToken.then(function setAuthToken(token) {
        if (token) {
            authToken = token;
        }
        authTokenLoaded = true;
        performOnLoad();
    }).catch(function handleTokenError(error) {
        alert(error);
    });

    function callLambda(
        ticket,
        aeroplanStatus,
        hasBonusPointsPrivilege,
        segments,
        baseFare,
        surcharges
    ) {
        $('#calculateSqd').buttonLoader('start');
        populateResults("");

        AWS.config.region = _config.cognito.region;
        AWS.config.credentials = new AWS.CognitoIdentityCredentials({
            IdentityPoolId: _config.cognito.identityPoolId,
            Logins: {
                ['cognito-idp.' + _config.cognito.region + '.amazonaws.com/' + _config.cognito.userPoolId]: authToken
            }
        });

        lambda = new AWS.Lambda({region: 'us-east-1'});
        const pullParams = {
            FunctionName : _config.lambda.functionName,
            InvocationType : 'RequestResponse',
            LogType : 'None',
            Payload : JSON.stringify({
                ticket : ticket,
                aeroplanStatus : aeroplanStatus,
                hasBonusPointsPrivilege : hasBonusPointsPrivilege,
                segments : segments,
                baseFare : baseFare,
                surcharges : surcharges,
                authToken : authToken
            })
        };

        lambda.invoke(pullParams, function(err, data) {
            if (err) {
                alert(err);
            } else {
                const response = JSON.parse(data.Payload);
                if (response.errorMessage) {
                    alert(response.errorMessage);
                } else {
                    const results = response.results;
                    populateResults(results);
                    populateUrl(ticket, aeroplanStatus, hasBonusPointsPrivilege, segments, baseFare, surcharges);
                }
            }

            $('#calculateSqd').buttonLoader('stop');
        });
    }

    function populateResults(results) {
        $('#resultsContainer').html(results);
    }

    function populateUrl(
        ticket,
        aeroplanStatus,
        hasBonusPointsPrivilege,
        segments,
        baseFare,
        surcharges
    ) {
        let queryParams = "?ticket=" + ticket +
            "&aeroplanStatus=" + aeroplanStatus +
            "&hasBonusPointsPrivilege=" + hasBonusPointsPrivilege +
            "&segments=" + segments +
            "&baseFare=" + baseFare +
            "&surcharges=" + surcharges;
        window.history.pushState({"queryParams":queryParams}, "", queryParams);
    }

    $(function onDocReady() {
        $('#calculateSqd').click(handleRequestClick);

        isDocReady = true;
        performOnLoad();
    });

    function performOnLoad() {
        if (!isDocReady || !authTokenLoaded) {
            return;
        }

        if (authToken != null) {
            const tokens = authToken.split(".");
            const payload = JSON.parse(atob(tokens[1]));
            const email = payload.email;
            $('#username').text(email);
            $('#signedInContainer').show();
            $('#notSignedInContainer').hide();
        } else {
            $('#signedInContainer').hide();
            $('#notSignedInContainer').show();
        }

        const shouldCalculate = populateFields();

        if (shouldCalculate) {
            performCalculateSqd();
        }
    }

    function performCalculateSqd() {
        const ticket = $('#ticket').val();
        const aeroplanStatus = $('#aeroplanStatus').val();
        const hasBonusPointsPrivilege = $('#hasBonusPointsPrivilege').is(':checked');
        const segments = $('#segments').val();
        const baseFare = $('#baseFare').val();
        const surcharges = $('#surcharges').val();
        callLambda(ticket, aeroplanStatus, hasBonusPointsPrivilege, segments, baseFare, surcharges);
    }

    function handleRequestClick(event) {
        event.preventDefault();
        const form = $('#sqdForm')[0];
        form.reportValidity();
        if (form.checkValidity()) {
            performCalculateSqd();
        }
    }

    function populateFields() {
        const urlParams = new URLSearchParams(window.location.search);

        const ticket = urlParams.get('ticket');
        if (ticket) {
            $('#ticket').val(ticket).change();
        }

        const aeroplanStatus = urlParams.get('aeroplanStatus');
        if (aeroplanStatus) {
            $('#aeroplanStatus').val(aeroplanStatus).change();
        }

        const hasBonusPointsPrivilege = urlParams.get('hasBonusPointsPrivilege');
        $('#hasBonusPointsPrivilege').prop( 'checked', hasBonusPointsPrivilege === 'true' );

        const segments = urlParams.get('segments');
        if (segments) {
            $('#segments').val(segments);
        }

        const baseFare = urlParams.get('baseFare');
        if (baseFare) {
            $('#baseFare').val(baseFare);
        }

        const surcharges = urlParams.get('surcharges');
        if (surcharges) {
            $('#surcharges').val(surcharges);
        }

        return segments && baseFare && surcharges;
    }
}(jQuery));
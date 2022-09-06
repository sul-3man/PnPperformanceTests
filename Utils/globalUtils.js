
import _ from "cdnjs.cloudflare.com/ajax/libs/underscore.js/1.9.0/underscore-min.js"
import { check } from "k6";
import { Counter, Gauge, Rate, Trend } from "k6/metrics";
import file from 'k6/x/file';
import exec from 'k6/execution';

export let globalConfig = {
    executor: 'ramping-vus',
    gracefulStop: '30s',
    single_User_Stages: [
        { target: 1, duration: '5m' },
    ],
    gracefulRampDown: '30s',
};



let http_req_blocked_max_ms = 10000;
let http_req_waiting_max_ms = 150000;
let http_req_duration_max_ms = 150000;

export let http_req_status_not_200_error_counter = new Counter("http_req_status_not_200_error_count");
export let http_req_blocked_error_counter = new Counter("http_req_blocked_error_count");
export let http_req_waiting_error_counter = new Counter("http_req_waiting_error_count");
export let http_req_duration_error_counter = new Counter("http_req_duration_error_count");
export let requestsTimeTrend = new Trend("custom_duration");

var filepath = 'Output\\' + GetDateTimeStamp(false) + 'failureLogs.txt';

export function WriteToFile(err) {
    file.appendString(filepath, `------------ Time : ${GetDateTimeStamp(true)}--------------------------------- \n`);
    file.appendString(filepath, `CURRENT VU IN USE: ${__VU}  -  ITER: ${__ITER} \n`);
    file.appendString(filepath, `ITERATIONS COMPLETED: ${exec.instance.iterationsCompleted} \n`);
    file.appendString(filepath, `TIME PASSED FROM START OF RUN: ${exec.instance.currentTestRunDuration} \n`);
    file.appendString(filepath, err + '\n');
}


export function checkResponses(res, requestName) {
    if (_.isArray(res)) {
        res.forEach(function (response) {
            checkResponse(response, requestName);
        });
    }
    else if (_.isObject(res)) {
        let keys = _.keys(res);
        if (!isNaN(parseInt(_.keys(res)[0]))) {
            keys.forEach(function (key) {
                checkResponse(res[key], requestName);
            });
        }
        else {
            checkResponse(res, requestName);
        }
    }
    else {
        checkResponse(res, requestName);
    }
}



function checkResponse(response, requestName) {
    check(response, { [`${requestName}`]: response => response.status.toString() === '200' }) // retruns all the checks within a group

    let url = response.url;
    let status = response.status;
    let http_req_blocked_ms = response.timings ? response.timings.blocked : 0;
    let http_req_waiting_ms = response.timings ? response.timings.waiting : 0;
    let http_req_duration_ms = response.timings ? response.timings.duration : 0;

    if (status !== 200 || http_req_blocked_ms >= http_req_blocked_max_ms || http_req_waiting_ms >= http_req_waiting_max_ms || http_req_duration_ms >= http_req_duration_max_ms) {
        if (status !== 200) {
            let reason = "";
            if (status !== 200) {
                http_req_status_not_200_error_counter.add(1);
                reason += "status=" + status + ". ";
            }

            if (http_req_blocked_ms >= http_req_blocked_max_ms) {
                http_req_blocked_error_counter.add(1);
                reason += "http_req_blocked=" + http_req_blocked_ms + " (time waiting for available TCP connection) exceeded max allowed value of " + http_req_blocked_max_ms + "ms. ";
            }

            if (http_req_waiting_ms >= http_req_waiting_max_ms) {
                http_req_waiting_error_counter.add(1);
                reason += "http_req_waiting=" + http_req_waiting_ms + " (time-to-first-byte) exceeded max allowed value of " + http_req_waiting_max_ms + "ms. ";
            }

            if (http_req_duration_ms >= http_req_duration_max_ms) {
                http_req_duration_error_counter.add(1);
                reason += "http_req_duration=" + http_req_duration_ms + " exceeded max allowed value of " + http_req_duration_max_ms + "ms. ";
            }

            let err = "\nRequest Name: " + requestName + "\n";
            err += "Request failed. URL: " + url + "\n";
            err += "Reason: " + reason + "\n";
            err += "Response Error: " + response.error + "\n";
            err += "Response Error Code: " + JSON.stringify(response.error_code) + "\n";
            err += "Request:\n" + JSON.stringify(response.request) + "\n";
            WriteToFile(err);
        }

    } else {
        console.info("CHECK : " + requestName + " - PASSED"); // returns individual checks
    }
}


export function GetDateTimeStamp(hrsminutesseconds) {
    var currentdate = new Date();
    var dateStamp = currentdate.getDate() + "_"
        + (currentdate.getMonth() + 1) + "_"
        + currentdate.getFullYear()
    if (hrsminutesseconds == true) {
        dateStamp = dateStamp + "_" + currentdate.getHours() + "_" + currentdate.getMinutes() + "_"
            + currentdate.getSeconds();
    }
    return dateStamp;
}

export function WriteToFile(err) {
    file.appendString(filepath, `------------ Time : ${GetDateTimeStamp(true)}--------------------------------- \n`);
    file.appendString(filepath, `CURRENT VU IN USE: ${__VU}  -  ITER: ${__ITER} \n`);
    file.appendString(filepath, `ITERATIONS COMPLETED: ${exec.instance.iterationsCompleted} \n`);
    file.appendString(filepath, `TIME PASSED FROM START OF RUN: ${exec.instance.currentTestRunDuration} \n`);
    file.appendString(filepath, err + '\n');
}

// searches and replace a string from within bigger string

export function replaceAllString(string, search, replace) {
    return string.split(search).join(replace);
}


// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract OracleMock {
    event RequestFulfilled(string result);

    function requestResult() external {
        emit RequestFulfilled("OK");
    }
}

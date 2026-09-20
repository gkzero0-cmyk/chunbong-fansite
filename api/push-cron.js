'use strict';

const pushNotifications=require('../lib/push-notifications-api');

module.exports=async function handler(req,res){
  return pushNotifications.handleDispatch(req,res);
};

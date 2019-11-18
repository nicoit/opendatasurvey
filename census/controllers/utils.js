'use strict';

const _ = require('lodash');
const FIELD_SPLITTER = /[\s,]+/;
const ANONYMOUS_USER_ID = process.env.ANONYMOUS_USER_ID ||  '0e7c393e-71dd-4368-93a9-fcfff59f9fff';
const marked = require('marked');
const Promise = require('bluebird');
const config = require('../config');
const url = require('url');
const querystring = require('querystring');
const util = require('util');

var makeChoiceValidator = function(param) {
  return function(req) {
    req.checkBody(param, 'You must make a valid choice').isChoice();
  };
};

var validators = {
  exists: {
    validate: makeChoiceValidator('exists'),
    require: ['digital', 'public', 'uptodate']
  },
  digital: {
    validate: makeChoiceValidator('digital'),
    require: ['online', 'machinereadable', 'bulk'],
    expectFalse: ['online', 'machinereadable', 'bulk']
  },
  public: {
    validate: makeChoiceValidator('public'),
    require: ['free'],
    expectFalse: ['free', 'online', 'openlicense', 'bulk']
  },
  free: {
    validate: makeChoiceValidator('free'),
    require: ['openlicense'],
    expectFalse: ['openlicense']
  },
  online: {
    validate: makeChoiceValidator('online'),
    require: ['url']
  },
  openlicense: {
    validate: makeChoiceValidator('openlicense'),
    require: ['licenseurl']
  },
  machinereadable: {
    validate: makeChoiceValidator('machinereadable'),
    require: ['format']
  },
  bulk: {
    validate: makeChoiceValidator('bulk')
  },
  uptodate: {
    validate: makeChoiceValidator('uptodate')
  },
  format: {
    type: 'string',
    validate: function(req) {
      req.checkBody('format', 'You must specify the data format').notEmpty();
    }
  },
  url: {
    type: 'string',
    validate: function(req) {
      req.checkBody('url', 'You must specify a valid URL').isURL();
    }
  },
  licenseurl: {
    type: 'string',
    validate: function(req) {
      req.checkBody('licenseurl', 'You must specify a valid URL').isURL();
    }
  }
};

var validateQuestion = function(req, question, parentQuestion, validated) {
  /**
   * Validate the question.
   *
   * If the answer is positive ("true") validate the field with all
   * possible values.
   *
   * If it's "false":
   *
   *  * check that all the "expectFalse" question values are "false".
   *
   * Then if the answer is negative ("false" or "null"):
   *
   *  * check all the required fields have the same values as its
   *    parent ("false" or "null") unless the field's type is string,
   *    in that case ensure that the string is empty.
   *
   * Iterate over the required questions recursively.
   */

  parentQuestion = parentQuestion || null;
  validated = validated || [];
  var validator = validators[question];
  var value = req.body[question];
  var parentValue = req.body[parentQuestion] || 'true';

  if (value === undefined) {
    req.checkBody(question, 'You must specify ' + question).equals('any');
  }

  // ensure false values for expectFalse questions
  if (value === 'false' && validator.expectFalse) {
    validator.expectFalse.forEach(function(child) {
      if (validated.indexOf(child) === -1) {
        req.checkBody(child, 'You can specify only \'false\'').equals('false');
        validated.push(child);
      }
    });
  }

  if (validated.indexOf(question) === -1) {
    // not yet validated
    // validate depending on the question value
    if (parentValue === 'null' || parentValue === 'false') {
      // validate falsy values
      if (validator.type === 'string') {
        req.checkBody(question, 'You must not specify this field').equals('');
      } else if (!(
        (parentValue === 'null') && (validators[parentQuestion].expectFalse))
      ) {
        req.checkBody(question, 'You can specify only \'' +
          parentValue + '\'').equals(parentValue);
      }
    } else {
      // parentValue has a truthy value, validate as normal
      validator.validate(req);
    }
    validated.push(question);
  }

  // validate recursively
  if (validator.require) {
    validator.require.forEach(function(child) {
      validateQuestion(req, child, question, validated);
    });
  }
};

var validateData = function(req, mappedErrors) {
  /**
   * Ensure valid data is submitted by checking the POST data on req.body
   * according to the declared validation logic. Used for new data
   * submissions, and revision proposals. Returns a promise.
   */
  var mapped = mappedErrors || false;

  req.checkBody('place', 'You must select a Place').notEmpty();
  req.checkBody('dataset', 'You must select a Dataset').notEmpty();

  validateQuestion(req, 'exists');

  // place and dataset must exist
  return Promise.join(
    req.app.get('models').Place.findAll({attributes: ['id']}),
    req.app.get('models').Dataset.findAll({attributes: ['id']}),
    function(places, datasets) {
      let placeIds = _.map(places, p => p.id);
      req.checkBody('place', 'You must select a valid Place').isIn(placeIds);

      let datasetIds = _.map(datasets, p => p.id);
      req.checkBody('dataset', 'You must select a valid Dataset')
      .isIn(datasetIds);

      return req.validationErrors(mapped);
    }
  );
};

var splitFields = function(data) {
  return _.each(data.trim().split(FIELD_SPLITTER), function(str) {
    str.trim();
  });
};

/*
  Return an array of field values where the keys match the regexp pattern.

  Returns an empty array if no matches.
*/
var commonFieldArray = function(data, pattern) {
  return _.filter(data, (v, k) => {
    return (pattern.test(k) && v !== '');
  });
};

var placeMapper = function(data, site) {
  var reviewers = (data.reviewers) ? splitFields(data.reviewers) : [];
  let disableforyears =
    (data.disableforyears) ? splitFields(data.disableforyears) : [];
  return _.defaults({
    id: data.id.toLowerCase(),
    reviewers: reviewers,
    disableforyears: disableforyears
  }, data);
};

var datasetMapper = function(data, site) {
  let characteristics = commonFieldArray(data, /^characteristics:\d+$/i);
  let reviewers = (data.reviewers) ? splitFields(data.reviewers) : [];
  let disableforyears =
    (data.disableforyears) ? splitFields(data.disableforyears) : [];
  let qsurl = data.questionseturl ||
    site.settings.question_set_url || config.get('fallback_questionset');
  if (!qsurl) {
    console.log('No QuestionSet is configured for ' +
                site.id + '/' + data.id.toLowerCase());
  }
  return _.defaults({
    id: data.id.toLowerCase(),
    description: marked(data.description),
    name: data.name || data.title,
    order: data.order || 100,
    reviewers: reviewers,
    disableforyears: disableforyears,
    characteristics: characteristics,
    updateevery: data.updateevery,
    qsurl: qsurl
  }, data);
};

var questionMapper = function(data, site) {
  var dependants = (data.dependants) ? splitFields(data.dependants) : null;
  let config = (data.config) ? JSON.parse(data.config) : {};
  return _.defaults({
    id: data.id.toLowerCase(),
    description: marked(data.description),
    dependants: dependants,
    config: config,
    score: data.score || 0,
    order: data.order || 100
  }, data);
};

var getCurrentState = function(data, match, year) {
  /*
    Return an object containing the state of submissions for a given
    place/dataset/year.

    Returned object has `match` and `pending` properties:
    `match`: the entry that isCurrent for the given place/dataset in the
    `match` param obj.
    `pending`: a boolean to detemine whether there's a pending entry for the
    place/dataset/year.
  */
  let pending;
  let matches;

  if (!match.place || !match.dataset) {
    match = {};
  } else {
    matches = _.filter(data.entries, {
      isCurrent: true,
      place: match.place,
      dataset: match.dataset
    });
    pending = _.any(data.pending, {
      isCurrent: false,
      year: year,
      place: match.place,
      dataset: match.dataset
    });
    if (matches.length) {
      match = _.first(matches);
    }
  }
  return {
    match: match,
    pending: pending
  };
};

var getReviewers = function(req, data) {
  var reviewers = [];
  if (req.user) {
    if (req.params.site.settings.reviewers) {
      reviewers = reviewers.concat(req.params.site.settings.reviewers);
    }
    if (data.place.reviewers) {
      reviewers = reviewers.concat(data.place.reviewers);
    }
    if (data.dataset.reviewers) {
      reviewers = reviewers.concat(data.dataset.reviewers);
    }
  }
  return reviewers;
};

var canReview = function(reviewers, user) {
  if (user) {
    return (_.intersection(reviewers, user.emails).length >= 1);
  }
  return false;
};

let buildDiscussionUrl = function(submissionDiscussionURL,
                                   gettext, pageUrl, dataset, place) {
  /*
    If `submissionDiscussionURL` is in the format:
    https://discuss.okfn.org/c/<topic>/<subtopic>, return a new topic url with
    a prepopulated topic for place and dataset. Otherwise, return the original
    `submissionDiscussionURL` without modification.
  */
  let parsedURL = url.parse(submissionDiscussionURL);
  // URL is a discourse link
  if (parsedURL.hostname === config.get('submission_discourse_hostname', '')) {
    let splitPathName = _.trimLeft(parsedURL.pathname, '/').split('/');
    // URL is a category link
    if (splitPathName[0] === 'c') {
      // Create a new topic link
      let newTopicURL = url.parse('');
      newTopicURL.protocol = parsedURL.protocol;
      newTopicURL.host = parsedURL.host;
      newTopicURL.pathname = 'new-topic';
      newTopicURL.search = querystring.stringify({
        title: util.format(gettext('Entry for %s / %s'), dataset, place),
        body: util.format(gettext('This is a discussion about the submission for [%s / %s](%s).'),
                          dataset, place, pageUrl),
        category: _.rest(splitPathName).join('/').replace(/-/g, ' ')
      });
      submissionDiscussionURL = url.format(newTopicURL);
    }
  }
  return submissionDiscussionURL;
};

module.exports = {
  validateData: validateData,
  placeMapper: placeMapper,
  datasetMapper: datasetMapper,
  questionMapper: questionMapper,
  getCurrentState: getCurrentState,
  getReviewers: getReviewers,
  canReview: canReview,
  FIELD_SPLITTER: FIELD_SPLITTER,
  ANONYMOUS_USER_ID: ANONYMOUS_USER_ID,
  commonFieldArray: commonFieldArray,
  buildDiscussionUrl: buildDiscussionUrl
};

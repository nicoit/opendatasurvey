import React from 'react';
import QuestionForm from './QuestionForm.jsx';
import $ from 'jquery';
import * as helpers from './HelperFields.jsx';

const EntryForm = React.createClass({

  _post(targetForm) {
    // disable submit buttons
    $('.submit button').attr('disabled', 'disable');

    let reviewAction =
      $(targetForm).find('button[name=reviewAction]').val();
    let questionsValid = this.refs.questions.validate();
    let yourKnowledgeValid = this.refs.yourKnowledgeQuestions.validate();

    // We can proceed if the form questions are valid, or if we're rejecting
    // the entry.
    if ((questionsValid && yourKnowledgeValid) || reviewAction === 'reject') {
      let form = $('<form>').attr({
        method: 'post', // eslint-disable-line quote-props
        'accept-charset': 'utf-8'
      });

      let questionData = this.refs.questions.state.questionState;
      $('<input>').attr({
        type: 'hidden',
        name: 'answers',
        value: JSON.stringify(questionData)
      }).appendTo(form);

      let aboutYouQuestionData =
        this.refs.yourKnowledgeQuestions.state.questionState;
      $('<input>').attr({
        type: 'hidden',
        name: 'aboutYouAnswers',
        value: JSON.stringify(aboutYouQuestionData)
      }).appendTo(form);

      let additionalInputs = $('.uncontrolled-fields :input').serializeArray();
      for (let i in additionalInputs) {
        if (additionalInputs.hasOwnProperty(i)) {
          $('<input>').attr({
            type: 'hidden',
            name: additionalInputs[i].name,
            value: additionalInputs[i].value
          }).appendTo(form);
        }
      }
      if (this.props.isReview) {
        $('<input>').attr({
          type: 'hidden',
          name: 'reviewAction',
          value: reviewAction
        }).appendTo(form);
      }
      form.appendTo(document.body);
      form.submit();
    } else {
      // Something is invalid, scroll to the first error.
      setTimeout(function() {
        let firstErrorQ = $('.field-errors').first().closest('.question');
        $('html, body').animate({scrollTop: $(firstErrorQ).offset().top}, 750);
      }, 100);

      $('.submit button').removeAttr('disabled');
    }
  },

  onSubmitHandler(e) {
    e.preventDefault();
    this._post(e.target);
  },

  componentWillMount() {
    this.yourKnowledgeQuestions = [
      {
        id: 'yourKnowledgeDomain',
        text: 'Califica tu conocimiento de ' + this.props.context.datasetName + '.',
        description: '',
        type: 'likert',
        placeholder: 'Clickea aca para contarnos mas de tu background. Cual es tu conocimiento de la de la materia, el gobierno de tu pais, y datos abiertos en general?',
        config: {
          options: [
            {
              description: 'No estoy muy informado de la materia',
              value: '1'
            },
            {
              description: 'Tengo conocimiento de la materia',
              value: '2'
            },
            {
              description: 'Tengo conocimiento avanzado de la materia',
              value: '3'
            }
          ]
        }
      },
      {
        id: 'yourKnowledgeOpenData',
        text: 'Califica tu conocimiento de datos abiertos.',
        description: '',
        type: 'likert',
        placeholder: '',
        config: {
          options: [
            {
              description: 'No estoy muy informado con datos abiertos',
              value: '1'
            },
            {
              description: 'Tengo conocimiento de datos abiertos',
              value: '2'
            },
            {
              description: 'Tengo conocimiento avanzado de datos abiertos',
              value: '3'
            }
          ]
        }
      }
    ];
    this.yourKnowledgeQSSchema = [
      {
        id: 'yourKnowledgeDomain',
        position: 1,
        defaultProperties: {
          required: true,
          enabled: true,
          visible: true
        },
        ifProvider: []
      },
      {
        id: 'yourKnowledgeOpenData',
        position: 2,
        defaultProperties: {
          required: true,
          enabled: true,
          visible: true
        },
        ifProvider: []
      }
    ];
  },

  render() {
    let readonly = (this.props.isReview && !this.props.canReview);
    let readOnlyOpts = {};
    if (readonly) readOnlyOpts.readOnly = 'readonly';
    return (<div>
<section>
  <div className="container">
    <div className="intro">
      <h1>Section A - About you</h1>
      <p>Te gustaria dejarnos algun comentario adicional?</p>
    </div>

    <QuestionForm context={this.props.context}
                  qsSchema={this.yourKnowledgeQSSchema}
                  questions={this.yourKnowledgeQuestions}
                  answers={this.props.answers.aboutYouAnswers}
                  readonly={readonly}
                  labelPrefix={'A'}
                  ref={'yourKnowledgeQuestions'} />
  </div>
</section>

<section>
  <div className="container">
    <div className="intro">
      <h1>Section B - Sobre los datos</h1>
    </div>

    <QuestionForm context={this.props.context}
                  qsSchema={this.props.qsSchema}
                  questions={this.props.questions}
                  answers={this.props.answers.answers}
                  readonly={readonly}
                  labelPrefix={'B'}
                  ref={'questions'} />
  </div>
</section>

<footer className="form-footer uncontrolled-fields">
  <input type="hidden" name="place" value={ this.props.place } />
  <input type="hidden" name="dataset" value={ this.props.dataset } />
  <input type="hidden" name="anonymous" id="anonymousNo" value="No"/>
  <div className="container">
    <div className="text question">
      <div className="instructions"></div>
      <div className="main">
        <div>
          <div className="instructions"></div>
          <h2>Algun comentario/aclaracion?</h2>
        </div>
        <div>
          <helpers.CurrentEntry />
          <div className="answer-wrapper">
            <div className="answer">
              <textarea name="details" rows="5"
                        defaultValue={this.props.answers.details}
                        {...readOnlyOpts}></textarea>
            </div>
          </div>
        </div>
      </div>
      <div className="comments"></div>
    </div>


    <helpers.SubmitActions isReview={this.props.isReview}
                           canReview={this.props.canReview}
                           onSubmitHandler={this.onSubmitHandler}
                           reviewComments={this.props.answers.reviewComments} />

    <helpers.DiscussionLink url={this.props.submissionDiscussionURL} isReview={this.props.isReview} />

  </div>
</footer>
</div>);
  }
});

module.exports = EntryForm;

import _ from 'lodash';
import React from 'react';

const DiscussionLink = props => {
  if (props.isReview && props.url) {
    return (
    <div className="submit continuation question">
      <div className="main">
        <div>
          <div className="instructions"></div>
          <p>Te gustaria debatir sobre estos datos? Inicia un debate en el foro  <a target="_blank" href={props.url}>aca!</a></p>
        </div>
      </div>
    </div>
    );
  }
  return null;
};

const QuestionErrors = props => {
  if (props.errors && props.errors.length) {
    let errorItems = _.map(props.errors, (err, i) => <li key={i}>{err}</li>);
    return (<div className="field-errors">
      <ul className="error-message">
        {errorItems}
      </ul>
    </div>);
  }
  return null;
};

const CurrentEntry = props => {
  if (props.currentValue && props.currentValue.length) {
    let currentValue = (_.isArray(props.currentValue)) ?
      props.currentValue : [props.currentValue];
    let dds = _.map(currentValue, (cv, i) => <dd key={i}>{cv}</dd>);
    return (<div className="current">
      <dl>
        <dt>Actual</dt>
        {dds}
      </dl>
    </div>);
  }
  return <div className="current" />;
};

const SubmitActions = props => {
  if (props.isReview && props.canReview) {
    return (<div>
    <div className="text question">
      <div className="main">
        <div>
          <div className="instructions"></div>
          <h2>Por favor agrega un comentario de porque estas aceptando o rechazando esta informacion. <strong>Este comentario va a ser publicamente visible</strong></h2>
        </div>
        <div>
          <CurrentEntry />
          <div className="answer-wrapper">
            <div className="answer">
              <textarea name="reviewComments" rows="5" defaultValue={props.reviewComments}></textarea>
            </div>
          </div>
        </div>
      </div>
      <div className="comments"></div>
    </div>
    <div className="submit continuation question">
      <div className="main">
        <div>
          <div className="instructions"></div>
          <h4>Importante</h4>
          <p>Como moderador de los datos, tu nombre va a ser mostrado.</p>
          <p>
            De ser necesario revisa todos los datos antes de enviar la solicitud.
          </p>
          <p>
            <span className="label label-info">Aceptar y Publicar</span> guardara los cambios hechos por el moderador.
          </p>
          <p>
            <span className="label label-danger">Rechazar</span> rechazara la carga y permitira una nueva ser creada.
          </p>
        </div>
        <div>
          <CurrentEntry />
          <div className="answer-wrapper">
            <div className="answer">
              <form method="post" acceptCharset="utf-8" className="entry-form" onSubmit={props.onSubmitHandler}>
                <button type="submit" className="btn" value="publish" name="reviewAction">Aceptar y Publicar</button>
              </form>
              <form method="post" acceptCharset="utf-8" className="entry-form" onSubmit={props.onSubmitHandler}>
                <button type="submit" className="btn" value="reject" name="reviewAction" className="reject">Rechazar</button>
              </form>
            </div>
          </div>
        </div>
      </div>
      <div className="comments"></div>
    </div>
    </div>);
  } else if (props.isReview && !props.canReview) {
    return null;
  } else {
    return (<div className="submit continuation question">
      <div className="main">
        <div>
          <div className="instructions"></div>
          <p><small>Al enviar los datos estas accediendo a los <a href="http://okfn.org/terms-of-use/">terminos de uso</a> y licensiando tu contribucion bajo los terminos del  <a href="http://opendatacommons.org/licenses/pddl/1.0/">Open Data Commons Public Domain Dedication and License</a>.</small></p>
        </div>
        <div>
          <CurrentEntry />
          <div className="answer-wrapper">
            <div className="answer">
              <form method="post" acceptCharset="utf-8" onSubmit={props.onSubmitHandler}>
                <button type="submit" className="btn">Enviar</button>
              </form>
            </div>
          </div>
        </div>
      </div>
      <div className="comments"></div>
    </div>);
  }
};

const QuestionInstructions = props => {
  if (props.instructionText) {
    return (
      <div className="instructions">
        <div className="collapse" id={'instructions' + props.id}>
          <h4>Instructions</h4>
          <span dangerouslySetInnerHTML={{__html: props.instructionText}} />
        </div>
        <a className="toggle"
           role="button"
           data-toggle="collapse"
           href={'#instructions' + props.id}
           aria-expanded="false"
           aria-controls={'instructions' + props.id}>
            <span className="sr-only">Help</span><span className="icon">?</span>
        </a>
      </div>
    );
  }
  return (<div className="instructions"></div>);
};

const QuestionComments = React.createClass({
  render() {
    let readOnlyOpts = {};
    if (this.props.readonly) readOnlyOpts.readOnly = 'readonly';
    return (<div className="comments">
      <label htmlFor={this.props.id + '_comment'}>Comentarios</label>
      <textarea placeholder={this.props.placeholder || 'Add comments' }
                id={this.props.id + '_comment'}
                rows="5"
                name={this.props.id + '_comment'}
                value={this.props.commentValue}
                onChange={this.handler}
                disabled={this.props.disabled}
                {...readOnlyOpts}></textarea>
    </div>);
  },

  handler(e) {
    this.props.onCommentChange(this, e.target.value);
  }
});

const QuestionHeader = props => {
  return (
    <h2>
      <span>{props.label}</span> {props.children.toString()}
    </h2>
  );
};

export {
  DiscussionLink,
  QuestionErrors,
  QuestionInstructions,
  QuestionComments,
  QuestionHeader,
  SubmitActions,
  CurrentEntry
};

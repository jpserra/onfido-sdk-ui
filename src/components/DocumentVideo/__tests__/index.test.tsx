import { h } from 'preact'
import { mount, shallow, ReactWrapper } from 'enzyme'

import MockedLocalised from '~jest/MockedLocalised'
import MockedReduxProvider from '~jest/MockedReduxProvider'
import DocumentOverlay, {
  Props as DocumentOverlayProps,
} from '../../Overlay/DocumentOverlay'
import DocumentLiveCapture, {
  Props as DocumentLiveCaptureProps,
} from '../../Photo/DocumentLiveCapture'
import VideoCapture, { Props as VideoCaptureProps } from '../../VideoCapture'
import Timeout, { Props as TimeoutProps } from '../../Timeout'

import DocumentVideo, { DocumentVideoProps } from '../index'
import Recording, { RecordingProps } from '../Recording'
import StartRecording, { StartRecordingProps } from '../StartRecording'

import type { CapturePayload } from '~types/redux'

jest.mock('../../CameraPermissions/withPermissionsFlow')

const fakeFrontPayload: CapturePayload = {
  blob: new Blob(),
  sdkMetadata: {},
}
const fakeVideoPayload: CapturePayload = {
  blob: new Blob(),
  sdkMetadata: {},
}
const fakeBackPayload: CapturePayload = {
  blob: new Blob(),
  sdkMetadata: {},
}

const defaultProps: DocumentVideoProps = {
  cameraClassName: 'fakeCameraClass',
  documentType: 'driving_licence',
  onCapture: jest.fn(),
  renderFallback: jest.fn(),
  trackScreen: jest.fn(),
}

describe('DocumentVideo', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it('renders without crashing', () => {
    const wrapper = shallow(
      <MockedReduxProvider>
        <MockedLocalised>
          <DocumentVideo {...defaultProps} />
        </MockedLocalised>
      </MockedReduxProvider>
    )
    expect(wrapper.exists()).toBeTruthy()
  })

  describe('when mounted', () => {
    let wrapper: ReactWrapper

    beforeEach(() => {
      wrapper = mount(
        <MockedReduxProvider>
          <MockedLocalised>
            <DocumentVideo {...defaultProps} />
          </MockedLocalised>
        </MockedReduxProvider>
      )
    })

    it('renders the front document capture by default', () => {
      const documentLiveCapture = wrapper.find<DocumentLiveCaptureProps>(
        DocumentLiveCapture
      )
      expect(documentLiveCapture.exists()).toBeTruthy()

      const {
        documentType,
        isUploadFallbackDisabled,
        renderFallback,
        trackScreen,
      } = documentLiveCapture.props()

      expect(documentType).toEqual(defaultProps.documentType)
      expect(isUploadFallbackDisabled).toBeTruthy()
      renderFallback('fake_fallback_reason')
      expect(defaultProps.renderFallback).toHaveBeenCalledWith(
        'fake_fallback_reason'
      )
      trackScreen('fake_screen_tracking')
      expect(defaultProps.trackScreen).toHaveBeenCalledWith(
        'fake_screen_tracking'
      )
    })

    describe('when capture video', () => {
      beforeEach(() => {
        const documentLiveCapture = wrapper.find<DocumentLiveCaptureProps>(
          DocumentLiveCapture
        )
        documentLiveCapture.props().onCapture(fakeFrontPayload)

        wrapper.update()
      })

      it('switches to video step after front side image captured', () => {
        const videoCapture = wrapper.find<VideoCaptureProps>(VideoCapture)
        expect(videoCapture.exists()).toBeTruthy()

        const {
          cameraClassName,
          inactiveError,
          onRedo,
          renderFallback,
          trackScreen,
        } = videoCapture.props()

        expect(cameraClassName).toEqual('fakeCameraClass')
        expect(inactiveError.name).toEqual('CAMERA_INACTIVE_NO_FALLBACK')

        expect(onRedo).toBeDefined()

        renderFallback('fake_fallback_reason')
        expect(defaultProps.renderFallback).toHaveBeenCalledWith(
          'fake_fallback_reason'
        )
        trackScreen('fake_screen_tracking')
        expect(defaultProps.trackScreen).toHaveBeenCalledWith(
          'fake_screen_tracking'
        )

        expect(videoCapture.find('StartRecording').exists()).toBeTruthy()
      })

      it('renders correct overlay', () => {
        const documentOverlay = wrapper.find<DocumentOverlayProps>(
          DocumentOverlay
        )
        expect(documentOverlay.exists()).toBeTruthy()
        expect(documentOverlay.props().type).toEqual(defaultProps.documentType)
      })

      describe('when recording', () => {
        beforeEach(() => {
          const button = wrapper.find('StartRecording Button > button')
          button.simulate('click')
        })

        it('handles redo fallback correctly', () => {
          const timeout = wrapper.find<TimeoutProps>(Timeout)
          timeout.props().onTimeout()
          wrapper.update()

          expect(wrapper.find('VideoCapture Recording').exists()).toBeFalsy()
          const startRecording = wrapper.find<StartRecordingProps>(
            StartRecording
          )
          expect(startRecording).toBeTruthy()

          // @FIXME: this requires mocking parseTags util in CameraError/index.tsx:69
          // expect(startRecording.props().disableInteraction).toBeFalsy()
        })

        it('starts recording correctly', () => {
          expect(
            wrapper.find('VideoCapture StartRecording').exists()
          ).toBeFalsy()
          const recording = wrapper.find<RecordingProps>(Recording)
          expect(recording.exists()).toBeTruthy()
          expect(recording.props().disableInteraction).toBeFalsy()
          expect(recording.props().hasMoreSteps).toBeTruthy()
          expect(recording.find('Instructions').exists()).toBeTruthy()
          expect(recording.find('Instructions').props()).toMatchObject({
            icon: 'tilt',
            title: 'doc_video_capture.instructions.video_tilt_title',
            subtitle: 'doc_video_capture.instructions.video_tilt_subtitle',
          })
        })

        it('moves to the next step correctly', () => {
          const button = wrapper.find('Recording Button > button')
          button.simulate('click')

          const recording = wrapper.find<RecordingProps>(Recording)
          expect(recording.props().disableInteraction).toBeFalsy()
          expect(recording.props().hasMoreSteps).toBeFalsy()
          expect(recording.find('Instructions').exists()).toBeTruthy()
          expect(recording.find('Instructions').props()).toMatchObject({
            icon: 'flip',
            title: 'doc_video_capture.instructions.video_flip_title',
            subtitle: 'doc_video_capture.instructions.video_flip_subtitle',
          })
        })

        it('switches to the back document capture step', () => {
          const button = wrapper.find('Recording Button > button')
          button.simulate('click')
          const videoCapture = wrapper.find<VideoCaptureProps>(VideoCapture)
          videoCapture.props().onVideoCapture(fakeVideoPayload)
          wrapper.update()

          expect(wrapper.find('VideoCapture').exists()).toBeFalsy()

          const documentLiveCapture = wrapper.find<DocumentLiveCaptureProps>(
            DocumentLiveCapture
          )
          expect(documentLiveCapture.exists()).toBeTruthy()

          documentLiveCapture.props().onCapture(fakeBackPayload)

          expect(defaultProps.onCapture).toHaveBeenCalledWith({
            front: fakeFrontPayload,
            back: fakeBackPayload,
            video: fakeVideoPayload,
          })
        })
      })
    })
  })
})
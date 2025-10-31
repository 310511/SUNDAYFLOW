import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Loader2 } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { checkTelrOrderStatus } from '@/services/telrPaymentApi';
import { completeBooking } from '@/services/bookingService';
import { addBookingToCustomBackend } from '@/services/bookingsApi';

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isVerifying, setIsVerifying] = useState(true);
  const [paymentDetails, setPaymentDetails] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const verifyPaymentAndConfirmBooking = async () => {
      // Get Telr order reference from URL parameters
      const orderRef = searchParams.get('order_ref') || searchParams.get('ref');
      
      if (!orderRef) {
        setError('No order reference found in URL');
        setIsVerifying(false);
        return;
      }

      try {
        console.log('🔍 Step 1: Verifying payment for order:', orderRef);
        
        // Step 1: Verify payment status with Telr
        const statusResponse = await checkTelrOrderStatus(orderRef);
        
        console.log('✅ Payment verification response:', statusResponse);
        
        // Check if payment was actually successful
        if (statusResponse.order.status.code === 3) {
          console.log('💳 Payment successful! Now confirming booking...');
          
          // Step 2: Get saved guest details and booking data
          const savedGuestDetails = localStorage.getItem('guest_details');
          const pendingBookingData = localStorage.getItem('pending_booking_data');
          const userData = JSON.parse(localStorage.getItem('userData') || 'null');
          
          if (!savedGuestDetails) {
            throw new Error('Guest details not found. Cannot confirm booking.');
          }
          
          const guestDetails = JSON.parse(savedGuestDetails);
          const bookingData = pendingBookingData ? JSON.parse(pendingBookingData) : null;
          
          const { bookingForm, roomGuests, bookingData: bookingInfo, rooms, guests, selectedRoom } = guestDetails;
          const roomData = selectedRoom || bookingData?.prebookData?.HotelResult?.Rooms;
          const bookingCode = roomData?.BookingCode;
          
          if (!bookingCode) {
            throw new Error('No booking code available. Cannot confirm booking.');
          }
          
          const totalFare = parseFloat(roomData?.TotalFare || roomData?.Price || 0);
          
          console.log('📦 Step 2: Confirming booking with data:', {
            bookingCode,
            bookingReferenceId: bookingInfo.bookingReference.booking_reference_id,
            totalFare,
            paymentConfirmed: true
          });

          // Flatten roomGuests structure for API
          // The roomGuests structure is: [{roomNumber: 1, guests: [{...}]}, ...]
          // We need to pass the complete room structure to preserve room-based guest distribution
          console.log('🔄 Processing room guests for booking:', roomGuests);

          // Step 3: Call booking API to confirm the booking
          const result = await completeBooking(
            bookingCode,
            bookingInfo.bookingReference.booking_reference_id,
            bookingInfo.customerData,
            bookingForm,
            totalFare,
            rooms,
            guests,
            roomGuests // Pass the full room structure
          );

          if (result.success) {
            console.log('🎉 Booking confirmed successfully!');
            
            const confirmationData = {
              confirmationNumber: result.confirmationNumber || 'N/A',
              bookingId: result.data?.BookingId || 'N/A',
              clientReferenceId: result.data?.ClientReferenceId || 'N/A',
              bookingReferenceId: bookingInfo.bookingReference.booking_reference_id,
              timestamp: new Date().toISOString()
            };
            
            // Store payment and booking confirmation
            const fullConfirmation = {
              ...confirmationData,
              payment: {
                orderRef: statusResponse.order.ref,
                cartId: statusResponse.order.cartid,
                amount: statusResponse.order.amount,
                currency: statusResponse.order.currency,
                transactionRef: statusResponse.order.transaction?.ref,
                status: 'Authorised'
              }
            };
            
            setPaymentDetails(statusResponse.order);
            localStorage.setItem('payment_confirmation', JSON.stringify(fullConfirmation));
            
            // Save to booking history
            const bookingHistory = JSON.parse(localStorage.getItem('booking_history') || '[]');
            bookingHistory.push({
              ...confirmationData,
              hotelName: bookingData?.hotelDetails?.HotelName || 'Unknown Hotel',
              roomName: roomData?.Name || 'Unknown Room',
              totalAmount: totalFare,
              customerEmail: bookingForm.email,
              customerName: `${bookingForm.firstName} ${bookingForm.lastName}`,
              paymentStatus: 'Paid'
            });
            localStorage.setItem('booking_history', JSON.stringify(bookingHistory));
            
            // Step 4: Add to custom backend
            try {
              console.log('📝 Storing booking in custom backend...');
              await addBookingToCustomBackend({
                booking_reference_id: confirmationData.bookingReferenceId,
                confirmation_number: confirmationData.confirmationNumber,
                client_reference_id: confirmationData.clientReferenceId,
                customer_id: userData?.customer_id || '',
                agency_name: 'TravelPro',
                hotel_code: bookingData?.hotelDetails?.HotelCode || '',
                check_in: bookingData?.checkIn || new Date().toISOString().split('T')[0],
                check_out: bookingData?.checkOut || new Date().toISOString().split('T')[0],
                booking_date: new Date().toISOString(),
                status: 'Confirmed',
                voucher_status: true,
                total_fare: totalFare,
                currency: bookingData?.prebookData?.HotelResult?.Currency || 'USD',
                no_of_rooms: rooms,
                invoice_number: `INV${Date.now()}`
              });
              console.log('✅ Booking stored in custom backend successfully');
            } catch (backendError) {
              console.error('⚠️ Failed to store in custom backend (non-critical):', backendError);
            }
            
            // Clean up - clear used data
            localStorage.removeItem('guest_details');
            localStorage.removeItem('pending_booking_data');
            localStorage.removeItem('booking_reference_id');
            localStorage.removeItem('telr_order_ref');
            
            console.log('🎉 ======= BOOKING & PAYMENT COMPLETE =======');
            console.log('📋 Confirmation Number:', confirmationData.confirmationNumber);
            console.log('🆔 Booking ID:', confirmationData.bookingId);
            console.log('💳 Transaction Ref:', statusResponse.order.transaction?.ref);
            console.log('==========================================');
            
          } else {
            throw new Error(`Booking confirmation failed: ${result.message || 'Unknown error'}`);
          }
          
        } else {
          setError(`Payment not authorized. Status: ${statusResponse.order.status.text}`);
        }
      } catch (error) {
        console.error('❌ Error in payment verification or booking confirmation:', error);
        setError(error instanceof Error ? error.message : 'Failed to verify payment or confirm booking. Please contact support with your payment reference.');
      } finally {
        setIsVerifying(false);
      }
    };

    verifyPaymentAndConfirmBooking();
  }, [searchParams]);

  if (isVerifying) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-16 mt-24">
          <Card className="max-w-2xl mx-auto">
            <CardContent className="pt-16 pb-16">
              <div className="flex flex-col items-center justify-center space-y-4">
                <Loader2 className="h-16 w-16 text-primary animate-spin" />
                <h2 className="text-2xl font-bold">Verifying Payment...</h2>
                <p className="text-muted-foreground text-center">
                  Please wait while we confirm your payment with the payment gateway.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-16 mt-24">
          <Card className="max-w-2xl mx-auto border-red-200">
            <CardHeader>
              <CardTitle className="text-red-600">Payment Verification Failed</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-red-600">{error}</p>
              <div className="flex gap-4">
                <Button onClick={() => navigate('/profile')} variant="outline">
                  View Bookings
                </Button>
                <Button onClick={() => navigate('/')} >
                  Back to Home
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-16 mt-24">
        <Card className="max-w-2xl mx-auto border-green-200 bg-green-50">
          <CardHeader>
            <div className="flex items-center justify-center mb-4">
              <CheckCircle className="h-20 w-20 text-green-600" />
            </div>
            <CardTitle className="text-center text-3xl text-green-700">
              Payment Successful!
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="text-center">
              <p className="text-lg text-green-800">
                Thank you for your payment. Your booking is now confirmed!
              </p>
            </div>

            {paymentDetails && (
              <div className="bg-white rounded-lg p-6 space-y-4">
                <h3 className="font-semibold text-lg mb-4">Payment Details</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Order Reference</p>
                    <p className="font-medium">{paymentDetails.ref}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-muted-foreground">Booking ID</p>
                    <p className="font-medium">{paymentDetails.cartid}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-muted-foreground">Amount Paid</p>
                    <p className="font-medium text-green-600 text-lg">
                      {paymentDetails.currency} {paymentDetails.amount}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <p className="font-medium text-green-600">{paymentDetails.status.text}</p>
                  </div>

                  {paymentDetails.transaction && (
                    <div className="col-span-2">
                      <p className="text-sm text-muted-foreground">Transaction Reference</p>
                      <p className="font-medium font-mono text-sm">{paymentDetails.transaction.ref}</p>
                    </div>
                  )}

                  {paymentDetails.card && (
                    <>
                      <div>
                        <p className="text-sm text-muted-foreground">Payment Method</p>
                        <p className="font-medium">{paymentDetails.card.type.name}</p>
                      </div>
                      
                      <div>
                        <p className="text-sm text-muted-foreground">Card</p>
                        <p className="font-medium">**** {paymentDetails.card.last4}</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <Button 
                onClick={() => navigate('/profile')}
                className="w-full"
                size="lg"
              >
                View My Bookings
              </Button>
              
              <Button 
                onClick={() => navigate('/')}
                variant="outline"
                className="w-full"
                size="lg"
              >
                Back to Home
              </Button>
            </div>

            <div className="text-center text-sm text-muted-foreground">
              <p>A confirmation email has been sent to your registered email address.</p>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Footer />
    </div>
  );
};

export default PaymentSuccess;

